package gmail

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"mime"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googleGmail "google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
)

const tokenFile = "gmail_token.json"

// Syncer fetches real Gmail messages and saves them to the local SQLite store.
type Syncer struct {
	store     *store.Store
	accountID string
	creds     string // path to credentials.json (Desktop App type)
}

// NewSyncer creates a Gmail syncer.
func NewSyncer(st *store.Store, accountID, credsFile string) *Syncer {
	return &Syncer{store: st, accountID: accountID, creds: credsFile}
}

// AuthorizeURL returns a Google OAuth2 URL the user must open in their browser.
// Call this only if no gmail_token.json exists yet.
func (s *Syncer) AuthorizeURL() (string, *oauth2.Config, error) {
	cfg, err := s.loadConfig()
	if err != nil {
		return "", nil, err
	}
	url := cfg.AuthCodeURL("snoozebox-state", oauth2.AccessTypeOffline)
	return url, cfg, nil
}

// ExchangeCode swaps the authorization code (pasted by user or full redirect URL) for a token and saves it.
func (s *Syncer) ExchangeCode(ctx context.Context, cfg *oauth2.Config, rawCode string) error {
	code := strings.TrimSpace(rawCode)
	// If the user pasted the entire redirect URL from the address bar
	if strings.Contains(code, "code=") {
		parts := strings.Split(code, "code=")
		if len(parts) > 1 {
			code = parts[1]
			if idx := strings.Index(code, "&"); idx != -1 {
				code = code[:idx]
			}
		}
	}
	// Also decode URL encoding if necessary
	if unescaped, err := url.QueryUnescape(code); err == nil && unescaped != "" {
		code = unescaped
	}

	tok, err := cfg.Exchange(ctx, strings.TrimSpace(code))
	if err != nil {
		return fmt.Errorf("exchange code: %w", err)
	}
	return saveToken(tokenFile, tok)
}

// IsAuthorized returns true if a saved token already exists.
func (s *Syncer) IsAuthorized() bool {
	_, err := tokenFromFile(tokenFile)
	return err == nil
}

// FetchUnread pulls up to maxResults unread inbox emails and saves them to SQLite.
// Returns the number of newly saved messages.
func (s *Syncer) FetchUnread(ctx context.Context, maxResults int64) (int, error) {
	client, err := s.getOAuthClient(ctx)
	if err != nil {
		return 0, err
	}

	svc, err := googleGmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return 0, fmt.Errorf("create gmail service: %w", err)
	}

	res, err := svc.Users.Messages.List("me").
		Q("is:unread in:inbox").
		MaxResults(maxResults).
		Do()
	if err != nil {
		return 0, fmt.Errorf("list messages: %w", err)
	}

	if res == nil || len(res.Messages) == 0 {
		return 0, nil
	}

	saved := 0
	for _, m := range res.Messages {
		full, err := svc.Users.Messages.Get("me", m.Id).Format("full").Do()
		if err != nil {
			log.Printf("[GmailSync] Skip message %s: %v", m.Id, err)
			continue
		}
		msg := gmailToMessage(s.accountID, full)
		if err := s.store.SaveMessage(ctx, msg); err != nil {
			log.Printf("[GmailSync] Save message %s: %v", m.Id, err)
			continue
		}
		saved++
	}
	log.Printf("[GmailSync] Synced %d new messages.", saved)
	return saved, nil
}

// getOAuthClient builds an authenticated HTTP client using the saved token.
func (s *Syncer) getOAuthClient(ctx context.Context) (*http.Client, error) {
	cfg, err := s.loadConfig()
	if err != nil {
		return nil, err
	}
	tok, err := tokenFromFile(tokenFile)
	if err != nil {
		return nil, fmt.Errorf("no Gmail token found — call /api/v1/gmail/auth first")
	}
	return cfg.Client(ctx, tok), nil
}

func (s *Syncer) loadConfig() (*oauth2.Config, error) {
	b, err := os.ReadFile(s.creds)
	if err != nil {
		return nil, fmt.Errorf("read credentials.json: %w", err)
	}
	cfg, err := google.ConfigFromJSON(b, googleGmail.GmailReadonlyScope)
	if err != nil {
		return nil, fmt.Errorf("parse credentials.json: %w", err)
	}
	return cfg, nil
}

func tokenFromFile(file string) (*oauth2.Token, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	tok := &oauth2.Token{}
	return tok, json.NewDecoder(f).Decode(tok)
}

func saveToken(file string, tok *oauth2.Token) error {
	f, err := os.Create(file)
	if err != nil {
		return fmt.Errorf("create token file: %w", err)
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(tok)
}

// gmailToMessage converts a Gmail API message into a SnoozeBox domain.Message.
func gmailToMessage(accountID string, m *googleGmail.Message) *domain.Message {
	headers := make(map[string]string)
	for _, h := range m.Payload.Headers {
		headers[strings.ToLower(h.Name)] = h.Value
	}

	subject := decodeHeader(headers["subject"])
	from := headers["from"]
	to := headers["to"]
	receivedAt := parseDate(headers["date"])

	body := extractBody(m.Payload)
	snippet := m.Snippet
	if len(snippet) > 150 {
		snippet = snippet[:150] + "..."
	}

	return &domain.Message{
		ID:          "gmail-" + m.Id,
		AccountID:   accountID,
		GmailID:     m.Id,
		ThreadID:    m.ThreadId,
		FromAddress: from,
		ToAddresses: []string{to},
		CcAddresses: []string{},
		Subject:     subject,
		ReceivedAt:  receivedAt,
		Snippet:     snippet,
		BodyText:    body,
		GmailLabels: m.LabelIds,
		SyncStatus:  "synced",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
}

func decodeHeader(s string) string {
	dec := new(mime.WordDecoder)
	decoded, err := dec.DecodeHeader(s)
	if err != nil {
		return s
	}
	return decoded
}

func parseDate(dateStr string) time.Time {
	formats := []string{
		time.RFC1123Z,
		"Mon, 2 Jan 2006 15:04:05 -0700",
		time.RFC1123,
		time.RFC3339,
	}
	for _, f := range formats {
		if t, err := time.Parse(f, dateStr); err == nil {
			return t.UTC()
		}
	}
	return time.Now().UTC()
}

// extractBody recursively extracts text/plain content from a MIME payload.
func extractBody(payload *googleGmail.MessagePart) string {
	if payload == nil {
		return ""
	}
	// Direct body
	if payload.MimeType == "text/plain" && payload.Body != nil && payload.Body.Data != "" {
		b, err := base64.URLEncoding.DecodeString(payload.Body.Data)
		if err == nil {
			return strings.TrimSpace(string(b))
		}
	}
	// Recurse into parts
	for _, part := range payload.Parts {
		if part.MimeType == "text/plain" && part.Body != nil && part.Body.Data != "" {
			b, err := base64.URLEncoding.DecodeString(part.Body.Data)
			if err == nil {
				return strings.TrimSpace(string(b))
			}
		}
		if text := extractBody(part); text != "" {
			return text
		}
	}
	return ""
}
