import type { SiteProfile } from '../../types'

interface ProfileFormProps {
  profile: SiteProfile
  accountUsername: string
  csrf: string
  photoError?: string
}

export function ProfileForm({ profile, accountUsername, csrf, photoError }: ProfileFormProps) {
  return (
    <section class="admin-shell">
      <div class="container">
        <a href="/admin" class="admin-back">← Dashboard</a>

        <div class="eyebrow">Identity</div>
        <h1>Profile &amp; <em>settings</em>.</h1>
        <p class="sub">Your name, links, photo, and login. Changes go live immediately.</p>

        {/* ============ PROFILE ============ */}
        <form class="admin-form" action="/admin/profile" method="post" enctype="multipart/form-data">
          <input type="hidden" name="_csrf" value={csrf} />

          <div class="field">
            <label>Profile photo</label>
            <div class="photo-field">
              <div class="photo-preview">
                {profile.photoPath && profile.photoPath.trim() ? (
                  <img src={profile.photoPath} alt="Current profile photo" />
                ) : (
                  <span class="photo-empty">No photo yet</span>
                )}
              </div>
              <div class="photo-input">
                <input type="file" id="photo" name="photo" accept="image/*" />
                <span class="hint">JPG, PNG, or WebP · up to 5MB. Leave empty to keep the current one.</span>
                {photoError && (
                  <div class="login-alert">{photoError}</div>
                )}
              </div>
            </div>
          </div>

          <div class="row-2">
            <div class="field">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" value={profile.name} required placeholder="Muhammad Gulomov" />
            </div>
            <div class="field">
              <label for="handle">Handle <span class="hint">(used in email + @mentions)</span></label>
              <input type="text" id="handle" name="handle" value={profile.handle} placeholder="muhammad-gulomov" />
            </div>
          </div>

          <div class="field">
            <label for="tagline">Tagline</label>
            <input type="text" id="tagline" name="tagline" value={profile.tagline} placeholder="Software engineer in Tashkent." />
          </div>

          <div class="row-2">
            <div class="field">
              <label for="location">Location</label>
              <input type="text" id="location" name="location" value={profile.location} placeholder="Tashkent, Uzbekistan" />
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" value={profile.email} placeholder="you@proton.me" />
            </div>
          </div>

          <div class="row-2">
            <div class="field">
              <label for="github">GitHub URL</label>
              <input type="url" id="github" name="github" value={profile.github} placeholder="https://github.com/…" />
            </div>
            <div class="field">
              <label for="linkedin">LinkedIn URL</label>
              <input type="url" id="linkedin" name="linkedin" value={profile.linkedin} placeholder="https://www.linkedin.com/in/…" />
            </div>
          </div>

          <div class="row-2">
            <div class="field">
              <label for="telegram">Telegram URL</label>
              <input type="url" id="telegram" name="telegram" value={profile.telegram} placeholder="https://t.me/…" />
            </div>
            <div class="field">
              <label for="instagram">Instagram URL</label>
              <input type="url" id="instagram" name="instagram" value={profile.instagram} placeholder="https://instagram.com/…" />
            </div>
          </div>

          <div class="form-footer">
            <div class="admin-actions">
              <button type="submit" class="btn primary">Save profile</button>
              <a href="/admin" class="btn">Cancel</a>
            </div>
          </div>
        </form>

        {/* ============ LOGIN & SECURITY ============ */}
        <section class="admin-section" style="margin-top:72px;">
          <header><h2>Login &amp; security</h2></header>

          <form class="admin-form" action="/admin/account" method="post">
            <input type="hidden" name="_csrf" value={csrf} />
            <div class="row-2">
              <div class="field">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value={accountUsername} required autocomplete="username" />
              </div>
              <div class="field">
                <label for="password">New password <span class="hint">(leave blank to keep current)</span></label>
                <input type="password" id="password" name="password" autocomplete="new-password" placeholder="••••••••" />
              </div>
            </div>
            <div class="form-footer">
              <div class="admin-actions">
                <button type="submit" class="btn primary">Update login</button>
              </div>
            </div>
          </form>

          <form action="/logout" method="post" style="margin-top:18px;">
            <input type="hidden" name="_csrf" value={csrf} />
            <button type="submit" class="btn logout-btn">Log out</button>
          </form>
        </section>
      </div>
    </section>
  )
}
