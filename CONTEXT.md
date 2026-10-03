# Crystal Ball

A mystical, astrology-flavoured oracle: you ask the ball a question and it reveals one speculative forecast.

This glossary includes planned product concepts; see [accepted reading-flow scope](docs/evidence/review-decisions.md#reading-flow-acceptance-and-pr-handoff--2026-10-01) for what this branch delivers and defers.

## Language

**Reading**:
One full consultation: a question, adaptive follow-up cards, and a revealed Forecast. The unit that is free once a day and that Plus and packs buy more of.
_Avoid_: prediction, session

**Forecast**:
The revealed answer of a Reading, carrying a headline, a Why and a Due date.
_Avoid_: prediction, result

**Due date**:
The date the ball itself sets for a Forecast, shown on the reveal, when the Check-in fires.
_Avoid_: deadline, resolution date

**Check-in**:
The "did it come true?" prompt on a Forecast's Due date; its answer is recorded on the Forecast. No accuracy score.

**Star**:
A Reading published to Tonight's Sky as a rewritten anonymous wording the asker approved. Never the raw question.
_Avoid_: post

**Tonight's Sky**:
The public, anonymous sky of today's Stars grouped by theme.

**Circle**:
A small private group of friends joined by invite link.

**Plus**:
The subscription: more Readings plus extras.

**Sun sign**:
Derived from the birthday asked at onboarding (skippable). Moon and rising signs come later, only if the user adds birth time and place in You.
_Avoid_: zodiac, horoscope sign

**Why**:
The explanation under a Forecast: a short astrological line plus the reasoning from the user's answers. Plus users can expand the deeper Why.

**Circle activity**:
What Circle members see of each other: the day someone consulted the ball, its theme, and their Sun sign. Never the question or Forecast.

**Sealed forecast**:
A Forecast about a friend, sent sealed; the recipient opens it by tapping the ball. Limited for free users, unlimited with Plus.

**Friend reading**:
A Plus Reading about a Circle member, allowed only if that member turned on "friends can ask about me" (off by default). It uses only their Sun sign and Circle activity themes; they are told someone asked, never what.

**Golden forecast**:
A rare Forecast with a gold reveal and card: 1 in 50 Readings for free users, 1 in 10 with Plus. Cosmetic; never implies it is more likely to come true.

**Daily omen**:
A short, fully personal omen shown on Home once a day, separate from the daily free Reading.

**Teen**:
A user aged 13 to 17, known from the onboarding birthday, which is also the age gate (under 13 is blocked). Forecast output follows the [all-age safety policy](docs/research/safety-policy.md).

**Person reading**:
A Reading about another person named by first name only (for example a crush). The named person is never notified and the ball knows nothing about them, unless they are an opted-in Circle member, in which case it is a Friend reading.
_Avoid_: crush reading, target

**School**:
The school a user belongs to, found from nearby location; it scopes school-specific Sky and Circles.

**Report / Block**:
Any user can report a Star or block a person; repeated reports hide content automatically. Every published line also passes an AI safety filter.

**School Sky**:
A "My school" filter on Tonight's Sky showing only Stars from the user's School.

## Relationships

- A **Reading** produces exactly one **Forecast**; a **Forecast** has one **Due date** and at most one **Check-in** answer.
- A **Star** is published from at most one **Reading**; one Star per person per day.
- A **Circle** holds at most 20 members; invites are single-use and expire in 7 days.
- A **Friend reading** requires the friend's opt-in; a **Person reading** requires nothing and notifies no one.
- The **School** is set once from approximate location; only the chosen School is stored.

## Flagged ambiguities

- "Explore" is retired: the tab becomes **Tonight's Sky** plus **Circles**.
- "Prediction" in code means **Forecast** in the product language.
