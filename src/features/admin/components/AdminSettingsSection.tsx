interface AdminSettingsSectionProps {
  settings: Record<string, string>
  busy: boolean
  onSave: (values: Record<string, string>) => Promise<void>
}

export function AdminSettingsSection({ settings, busy, onSave }: AdminSettingsSectionProps) {
  return (
    <>
      <h1>Site settings</h1>
      <form
        className="contact-form"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          void onSave({
            availability_note: String(formData.get('availability_note') || ''),
            contact_headline: String(formData.get('contact_headline') || ''),
          })
        }}
      >
        <div className="form-field full">
          <label htmlFor="setting-availability">Availability note</label>
          <input
            id="setting-availability"
            name="availability_note"
            defaultValue={settings.availability_note || ''}
            placeholder="Optional note stored in site settings"
          />
        </div>
        <div className="form-field full">
          <label htmlFor="setting-headline">Contact note</label>
          <input
            id="setting-headline"
            name="contact_headline"
            defaultValue={settings.contact_headline || ''}
            placeholder="Optional note stored in site settings"
          />
        </div>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </>
  )
}
