# Repairing outcome-guessing cards

The initial real holiday plan asked what would happen and supplied guesses such as rain all day and lost luggage. Both attempts failed structural validation. A first more-specific repair only removed future tense; its superficially valid result remained semantically wrong. That failed experiment is retained in holiday-plan-tense-only-repair.json.

The final repair explicitly requires replacing outcome guesses, not changing their tense. It asks for preparations already completed, previous experience, available time or preferences that are knowable now. The same real local model then returned completed-booking and preference cards, plus the server-owned event-date card; holiday-plan-diagnosis.json retains all calls and the result. Card questions containing “will” are rejected, as are such options. This targeted replay proves the observed correction, not general semantic reliability. One repair remains the maximum.
