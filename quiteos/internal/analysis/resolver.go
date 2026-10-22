package analysis

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

type ResolvedDeadline struct {
	ResolvedAt *time.Time
	Precision  string // "datetime", "date", "unknown"
	IsExplicit bool
	IsVague    bool
	Timezone   string
}

// ResolveDeadlines deterministically converts extracted natural language deadline strings
// into concrete UTC timestamps anchored to the email's ReceivedAt timestamp.
func ResolveDeadline(phrase string, receivedAt time.Time, userTZ string) ResolvedDeadline {
	clean := strings.ToLower(strings.TrimSpace(phrase))
	if clean == "" {
		return ResolvedDeadline{Precision: "unknown"}
	}

	// Detect vague/ambiguous deadlines that must NOT be converted to fake exact times
	vagueKeywords := []string{"sometime", "whenever", "next month", "soon", "in the future", "eventually", "no rush"}
	for _, vk := range vagueKeywords {
		if strings.Contains(clean, vk) {
			return ResolvedDeadline{
				Precision:  "unknown",
				IsExplicit: false,
				IsVague:    true,
			}
		}
	}

	loc := time.UTC
	if userTZ != "" {
		if l, err := time.LoadLocation(userTZ); err == nil {
			loc = l
		}
	}

	recInLoc := receivedAt.In(loc)

	// Pattern 1: ISO dates "2026-10-25" or "2026-10-25 17:00:00"
	if t, err := time.Parse("2006-01-02", clean); err == nil {
		utc := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, loc).UTC()
		return ResolvedDeadline{ResolvedAt: &utc, Precision: "date", IsExplicit: true, Timezone: loc.String()}
	}

	// Pattern 2: "today at 5:00 pm" or "today at 5 pm"
	if strings.Contains(clean, "today") {
		hour, min := parseTimeOfDay(clean)
		resolved := time.Date(recInLoc.Year(), recInLoc.Month(), recInLoc.Day(), hour, min, 0, 0, loc).UTC()
		return ResolvedDeadline{ResolvedAt: &resolved, Precision: "datetime", IsExplicit: true, Timezone: loc.String()}
	}

	// Pattern 3: "tomorrow at 4:00 pm" or "tomorrow 11:00 am"
	if strings.Contains(clean, "tomorrow") {
		nextDay := recInLoc.AddDate(0, 0, 1)
		hour, min := parseTimeOfDay(clean)
		resolved := time.Date(nextDay.Year(), nextDay.Month(), nextDay.Day(), hour, min, 0, 0, loc).UTC()
		return ResolvedDeadline{ResolvedAt: &resolved, Precision: "datetime", IsExplicit: true, Timezone: loc.String()}
	}

	// Pattern 4: Named months e.g. "october 24 at 17:00 utc", "october 25, 2026", "monday, october 26, 2026, 23:59 utc"
	monthRe := regexp.MustCompile(`(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?`)
	matches := monthRe.FindStringSubmatch(clean)
	if len(matches) > 2 {
		monthName := matches[1]
		day, _ := strconv.Atoi(matches[2])
		year := recInLoc.Year()
		if len(matches) > 3 && matches[3] != "" {
			if y, err := strconv.Atoi(matches[3]); err == nil {
				year = y
			}
		}

		m := parseMonth(monthName)
		hour, min := parseTimeOfDay(clean)
		prec := "datetime"
		if !strings.Contains(clean, ":") && !strings.Contains(clean, "am") && !strings.Contains(clean, "pm") {
			hour = 23
			min = 59
			prec = "date"
		}

		resolved := time.Date(year, m, day, hour, min, 0, 0, loc).UTC()
		return ResolvedDeadline{ResolvedAt: &resolved, Precision: prec, IsExplicit: true, Timezone: loc.String()}
	}

	// Pattern 5: Day of week "thursday noon", "friday at 3:00 pm", "thursday at 5:00 pm"
	days := map[string]time.Weekday{
		"sunday":    time.Sunday,
		"monday":    time.Monday,
		"tuesday":   time.Tuesday,
		"wednesday": time.Wednesday,
		"thursday":  time.Thursday,
		"friday":    time.Friday,
		"saturday":  time.Saturday,
	}

	for dayName, targetWeekday := range days {
		if strings.Contains(clean, dayName) {
			daysAhead := int(targetWeekday - recInLoc.Weekday())
			if daysAhead <= 0 {
				daysAhead += 7
			}
			targetDate := recInLoc.AddDate(0, 0, daysAhead)
			hour, min := parseTimeOfDay(clean)
			resolved := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), hour, min, 0, 0, loc).UTC()
			return ResolvedDeadline{ResolvedAt: &resolved, Precision: "datetime", IsExplicit: true, Timezone: loc.String()}
		}
	}

	return ResolvedDeadline{
		Precision:  "unknown",
		IsExplicit: false,
	}
}

func parseTimeOfDay(str string) (int, int) {
	if strings.Contains(str, "noon") {
		return 12, 0
	}
	if strings.Contains(str, "evening") {
		return 20, 0
	}
	if strings.Contains(str, "midnight") {
		return 23, 59
	}

	// e.g. "17:00" or "06:00" or "5:00 pm" or "4:00 pm"
	timeRe := regexp.MustCompile(`(\d{1,2})(?::(\d{2}))?\s*(am|pm|utc)?`)
	matches := timeRe.FindAllStringSubmatch(str, -1)
	for _, m := range matches {
		if len(m) > 1 {
			hour, _ := strconv.Atoi(m[1])
			min := 0
			if len(m) > 2 && m[2] != "" {
				min, _ = strconv.Atoi(m[2])
			}
			ampm := ""
			if len(m) > 3 {
				ampm = m[3]
			}

			if ampm == "pm" && hour < 12 {
				hour += 12
			} else if ampm == "am" && hour == 12 {
				hour = 0
			}

			if hour >= 0 && hour <= 23 && min >= 0 && min <= 59 {
				return hour, min
			}
		}
	}

	return 17, 0 // default close of business (5 PM)
}

func parseMonth(m string) time.Month {
	switch strings.ToLower(m) {
	case "january":
		return time.January
	case "february":
		return time.February
	case "march":
		return time.March
	case "april":
		return time.April
	case "may":
		return time.May
	case "june":
		return time.June
	case "july":
		return time.July
	case "august":
		return time.August
	case "september":
		return time.September
	case "october":
		return time.October
	case "november":
		return time.November
	case "december":
		return time.December
	default:
		return time.October
	}
}
