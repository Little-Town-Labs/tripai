# Contract: Intake Form

## Owner Route Contract

### Route

`/app/intake`

### Access

- Signed-in owner: can view and complete the intake wizard.
- Signed-out visitor: redirected to sign in by the existing owner app protection.
- Family share-link recipient: not part of this route.

### Page Behavior

- Shows a multi-step wizard with progress.
- Preserves answers while moving forward and backward.
- Allows final save only after required answers are valid.
- Shows a ready-for-generation next state after successful save.
- Does not show AI-generated recommendations, venue facts, or drive-time claims.

## Server Action Contract

### Action

`saveTripIntakeAction(prevState, formData)`

### Authentication

- MUST call the owner session helper inside the action.
- MUST fail safely when no owner session exists.
- MUST not trust hidden owner identifiers from the browser.

### Input Fields

- `originAddress`
- `destinationArea`
- `startDate`
- `endDate`
- `partyAdults`
- `partyChildren`
- `childrenAges`
- `interests`
- `budgetLevel`
- `dietaryNeeds`
- `mobilityNotes`
- `travelStyle`
- `additionalConstraints`

`additionalConstraints` may be folded into existing note-style fields for F4 if the database schema does not yet have a dedicated column.

### Success Result

```ts
{
  status: "success";
  intakeId: string;
  message: string;
}
```

### Validation Failure Result

```ts
{
  status: "error";
  message: string;
  fieldErrors: Record<string, string[]>;
  values: Record<string, string | string[]>;
}
```

### Persistence Failure Result

```ts
{
  status: "error";
  message: string;
  fieldErrors: {};
  values: Record<string, string | string[]>;
}
```

### Persistence Rules

- Insert into `trip_intakes` with the authenticated owner ID.
- Execute the insert with the app role and `tripai.owner_id` set for the transaction.
- Return success only after the database confirms the row was inserted.
- Do not log secrets or owner private data.

## Test Contract

- Unit tests cover normalization and validation for valid input, invalid dates, invalid party counts, child age mismatch, and invalid enum values.
- Service tests prove owner-context persistence inserts an owner-scoped row and rejects cross-owner access.
- E2E tests prove a signed-in owner can complete the wizard and a signed-out visitor cannot access it.
- E2E tests cover at least one mobile viewport and one desktop viewport.
