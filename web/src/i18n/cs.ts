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
    loggedInAs: 'Přihlášen/a jako',
    placeholder: 'Tento týden — připravujeme.',
    logout: 'Odhlásit se',
  },
  thisWeek: {
    title: 'Tento týden',
    empty: 'Tento týden zatím nejsou žádná jídla.',
    signup: 'Přihlásit se',
    edit: 'Upravit',
    cookSummaryLink: 'Souhrn kuchaře',
    // Member-facing "who is signed up / portion totals" arrives once the BE adds
    // those endpoints (#53); until then this screen lists dishes and links to signup.
  },
  cookSummary: {
    title: 'Souhrn kuchaře',
    dayLabel: 'Den:',
    portionsUnit: '×',
    noSignups: 'Na tento den nikdo není přihlášen.',
    createDish: 'Založit jídlo',
  },
  signup: {
    title: 'Přihláška na jídlo',
    pickDay: 'Vyber den z bloku jídla:',
    portionsLabel: 'Počet porcí',
    submit: 'Přihlásit se',
    cancel: 'Zrušit přihlášku',
    signedUp: 'Přihlášeno.',
    noDay: 'Vyber prosím den.',
    invalidPortions: 'Počet porcí musí být alespoň 1.',
    invalidDay: 'Tento den není v bloku jídla.',
  },
  dish: {
    addAction: 'Přidat jídlo',
    createTitle: 'Nové jídlo',
    editTitle: 'Upravit jídlo',
    nameLabel: 'Název jídla',
    startLabel: 'Od (den)',
    endLabel: 'Do (den)',
    submit: 'Uložit jídlo',
    delete: 'Smazat jídlo',
    invalidBlock: 'Konec bloku nesmí být před začátkem.',
    forbidden: 'Jídlo smí přidat jen kuchař nebo volitel týdne.',
  },
} as const

export type Messages = typeof cs
