# Data Model: Intake Form

## Entity: Trip Intake Draft

Represents the owner's planning answers before trip generation.

### Fields

- `id`: Unique draft identifier generated when saved
- `ownerId`: Authenticated owner who controls the draft
- `originAddress`: Starting point for the road trip
- `destinationArea`: Destination city, area, or region
- `startDate`: First travel date
- `endDate`: Final travel date
- `partyAdults`: Number of adult travelers
- `partyChildren`: Number of child travelers
- `childrenAges`: Ages for children when child travelers are present
- `interests`: Selected planning interests
- `budgetLevel`: `budget`, `moderate`, or `premium`
- `dietaryNeeds`: Food preferences or restrictions
- `mobilityNotes`: Accessibility, walking tolerance, stroller, or other mobility constraints
- `travelStyle`: `packed`, `balanced`, or `relaxed`
- `createdAt`: Save timestamp
- `updatedAt`: Last update timestamp

### Validation Rules

- `originAddress`, `destinationArea`, `startDate`, `endDate`, `budgetLevel`, and `travelStyle` are required.
- `endDate` must be the same as or later than `startDate`.
- MVP trip length must be between 1 and 21 days inclusive.
- Adult and child counts must be non-negative whole numbers.
- At least one traveler must be present.
- If children are present, child ages must be provided as whole numbers from 0 to 17.
- If no children are present, child ages must be empty.
- `budgetLevel` must be one of `budget`, `moderate`, or `premium`.
- `travelStyle` must be one of `packed`, `balanced`, or `relaxed`.
- Interest and dietary lists may be empty but must not contain blank entries after normalization.

### Ownership Rules

- Saved drafts are owner-only by default.
- Signed-out visitors cannot create owner-scoped drafts.
- One owner cannot read or mutate another owner's drafts.
- Share-link recipients do not have access to trip intake drafts.

## Entity: Validation State

Represents field-specific problems that block saving.

### Fields

- `field`: Stable field identifier used by the wizard
- `message`: Plain-language correction message
- `step`: Wizard step where the field appears

### Rules

- Validation state must not include database internals, SQL errors, auth provider internals, or private owner data.
- Save failure state must preserve submitted values so the owner can retry.
