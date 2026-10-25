/**
 * Human copy & personality helpers for SnoozeBox.
 * Tone: warm, dry, slightly sleepy, authentic human touch.
 */

// 1. Pluralize helper
export function pluralize(n: number, one: string, many: string, zero?: string): string {
  if (n === 0) {
    return zero !== undefined ? zero : `no ${many}`;
  }
  if (n === 1) {
    return `1 ${one}`;
  }
  return `${n} ${many}`;
}

// 2. Date-seeded stable copy pool
// Hashes date (YYYY-MM-DD) + key into a stable integer index so text doesn't flicker on re-renders
function getDailySeed(key: string): number {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${key}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickCopy(variants: string[], key: string): string {
  if (!variants || variants.length === 0) return '';
  const idx = getDailySeed(key) % variants.length;
  return variants[idx];
}

// 3. Time-aware greeting
export function getTimeAwareGreeting(quietStart?: string): string {
  const now = new Date();
  const hours = now.getHours();

  // If user configured quiet hours start, check if currently in late night
  if (quietStart) {
    const [qH] = quietStart.split(':').map(Number);
    if (!isNaN(qH) && hours >= qH) {
      return 'Why are you up?';
    }
  }

  if (hours < 5) return 'Why are you up?';
  if (hours < 11) return 'Morning.';
  if (hours < 17) return 'Afternoon.';
  if (hours < 22) return 'Evening.';
  return 'Why are you up?';
}

// 4. Snorlax mood speech bubble lines based on urgent items count & completed state
export function getSnorlaxSpeech(urgentCount: number, dueSoonCount: number, allDone = false): string {
  const greeting = getTimeAwareGreeting();

  if (allDone) {
    return pickCopy(
      [
        `${greeting} All tasks eaten today. Belly up, crumb on my chin. Perfection.`,
        `${greeting} You ate every snack on the list. I am officially going back to sleep.`,
        `${greeting} Clean plate. Snorlax gives two paws up. Go enjoy your day.`,
      ],
      'all-done'
    );
  }

  if (urgentCount === 0) {
    if (dueSoonCount === 0) {
      return pickCopy(
        [
          `${greeting} Nothing's on fire. I checked. Go back to sleep.`,
          `${greeting} Zero alarms today. Snorlax approves. Feel free to nap.`,
          `${greeting} Clean calm horizon. I handled the small stuff while you slept.`,
        ],
        'zero-urgent'
      );
    }
    return pickCopy(
      [
        `${greeting} Nothing urgent today. Just ${pluralize(dueSoonCount, 'snack', 'snacks')} to nibble on whenever you feel like it.`,
        `${greeting} No wake-up calls. ${pluralize(dueSoonCount, 'thing', 'things')} due later, but no rush right now.`,
        `${greeting} Peace and calm. ${pluralize(dueSoonCount, 'snack', 'snacks')} ahead, but nothing worth stressing over.`,
      ],
      'due-soon-only'
    );
  }

  if (urgentCount === 1) {
    return pickCopy(
      [
        `${greeting} Only one thing is worth waking up for today. The rest I handled while you slept.`,
        `${greeting} Just one wake-up call today. Take care of it, then go right back to resting.`,
        `${greeting} One spicy email waiting. Once that's done, today is clear.`,
      ],
      'one-urgent'
    );
  }

  if (urgentCount === 2) {
    return pickCopy(
      [
        `${greeting} Two things need eyeballs today. Let's crunch them and return to lounging.`,
        `${greeting} Got two spicy snacks that can't wait. Ready when you are.`,
        `${greeting} Two alarms woke me up. Let's finish them fast so we can both nap.`,
      ],
      'two-urgent'
    );
  }

  // 3+ urgent: Panicked / grumpy woke up fully
  return pickCopy(
    [
      `${greeting} Whoa. ${urgentCount} things want your attention right now. Ears up!`,
      `${greeting} Okay, I'm wide awake. ${urgentCount} urgent alarms piling in. Let's triage!`,
      `${greeting} The alarm won't stop. ${urgentCount} things need immediate action.`,
    ],
    'many-urgent'
  );
}

// 5. Done Toast Copy Pool
export function getDoneToastCopy(): string {
  return pickCopy(
    [
      'Munch.',
      'Gone. Tasty.',
      'One less thing.',
      'Burp. Next?',
      'Deliciously finished.',
    ],
    `done-${Math.floor(Date.now() / 15000)}`
  );
}

// 6. Snooze Toast Copy Pool
export function getSnoozeToastCopy(): string {
  return pickCopy(
    [
      'Back to sleep.',
      'Resting until tomorrow.',
      'Snoozed. Good call.',
      'Zzz. Tomorrow’s problem.',
      'Put to bed gently.',
    ],
    `snooze-${Math.floor(Date.now() / 15000)}`
  );
}

// 7. Dismiss Toast Copy Pool
export function getDismissToastCopy(): string {
  return pickCopy(
    [
      'Let it go. Gone forever.',
      'Ignored with style.',
      'Dropped. Peace restored.',
      'Out of sight, out of mind.',
    ],
    `dismiss-${Math.floor(Date.now() / 15000)}`
  );
}

// 8. Empty States Copy
export const EMPTY_STATES = {
  morning: [
    "Nothing's on fire. Go outside.",
    'No urgent alarms today. Snorlax approves. Go nap.',
    'All clear. The inbox can wait.',
  ],
  tasks: [
    'No tasks. Weird. Enjoy it.',
    'Task belly is empty. Clean plate.',
    'Nothing to do here. Perfect time for tea.',
  ],
  inbox: [
    'Inbox is clean. I did nothing. You did nothing. Perfect.',
    'No emails here. Snorlax checked twice.',
    'All calm in the fridge.',
  ],
};

// 9. Loading Copy Variants
export const LOADING_COPY = [
  'Snorlax is yawning...',
  'Still waking up...',
  'Reading your mail slowly, on purpose.',
  'Stretching paws and sorting snacks...',
];
