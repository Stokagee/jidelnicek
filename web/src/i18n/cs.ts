// All user-facing strings in one place (frontend skill rule 7). V1 is a private
// Czech-speaking household app, so copy is Czech; keys/structure are English so
// this can move into a real i18n setup later without touching components.
// Screens add their own sections here as they land (EP-3 = claim + login).

export const cs = {
  common: {
    name: 'Jméno',
    password: 'Heslo',
    submit: 'Odeslat',
    loading: 'Načítání…',
    genericError: 'Něco se pokazilo. Zkus to prosím znovu.',
  },
  claim: {
    title: 'Nastavení účtu',
    intro: 'Nastav si jméno a heslo pro přístup do jídelníčku.',
    submit: 'Vytvořit účet',
    invalidToken: 'Tento odkaz už neplatí nebo byl použit.',
  },
  login: {
    title: 'Přihlášení',
    submit: 'Přihlásit se',
    invalidCredentials: 'Nesprávné jméno nebo heslo.',
  },
  home: {
    // Placeholder landing until the real "This week" screen lands (T-7.3).
    loggedInAs: 'Přihlášen/a jako',
    placeholder: 'Tento týden — připravujeme.',
    logout: 'Odhlásit se',
  },
} as const

export type Messages = typeof cs
