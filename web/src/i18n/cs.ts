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
    back: '← Zpět',
  },
  theme: {
    dark: 'Tmavý',
    light: 'Světlý',
  },
  days: {
    short: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  },
  claim: {
    title: 'Nastavení účtu',
    intro: 'Nastav si jméno a heslo pro přístup do jídelníčku.',
    submit: 'Vytvořit účet',
    invalidToken: 'Tento odkaz už neplatí nebo byl použit.',
    nameRequired: 'Zadej jméno.',
    passwordRequired: 'Zadej heslo.',
  },
  login: {
    title: 'Přihlášení',
    submit: 'Přihlásit se',
    invalidCredentials: 'Nesprávné jméno nebo heslo.',
    nameRequired: 'Zadej jméno.',
    passwordRequired: 'Zadej heslo.',
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
    yourDays: 'Tvoje dny jako volitel:',
    // #80: browse the next 30 days by week or by month.
    viewWeek: 'Týden',
    viewMonth: 'Měsíc',
    prevWeek: 'Předchozí týden',
    nextWeek: 'Další týden',
    monthTitle: 'Příštích 30 dní',
    addOnDay: 'Přidat jídlo na tento den',
  },
  cookSummary: {
    title: 'Souhrn kuchaře',
    portionsUnit: '×',
    noSignups: '—',
    createDish: 'Založit jídlo',
    openChoosing: {
      enable: 'Povolit všem zakládat jídla',
      disable: 'Zrušit – zakládá jen kuchař a volitel',
      hint: 'Když je zapnuto, jídla může zakládat kdokoliv. Když vypnuto, jen kuchař a volitel týdne.',
    },
    chooser: {
      currentLabel: 'Volitel týdne:',
      notSet: 'Zatím není nastaven',
      daysLabel: 'Dny volitele:',
      placeholder: '— vyberte volitele —',
      setButton: 'Nastav volitele',
      confirmButton: 'Potvrdit',
      cancelButton: 'Zrušit',
      saved: 'Volitel nastaven.',
      unknown: 'Neznámý uživatel',
    },
  },
  signup: {
    title: 'Přihláška na jídlo',
    pickDay: 'Vyber dny z bloku jídla:',
    portionsLabel: 'Počet porcí',
    submit: 'Přihlásit se',
    cancel: 'Zrušit přihlášku',
    cancelAll: 'Zrušit vše',
    signedUp: 'Přihlášeno.',
    noDay: 'Vyber prosím aspoň jeden den.',
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
    nameRequired: 'Zadej název jídla.',
    noDay: 'Vyber prosím aspoň jeden den.',
    invalidBlock: 'Konec bloku nesmí být před začátkem.',
    forbidden: 'Jídlo smí přidat jen kuchař nebo volitel týdne.',
    blockPickerLabel: 'Vyber blok dní pro jídlo',
    blockFrom: 'Od:',
    blockTo: 'do:',
    // #80: pick the day to plan within the next 30 days, then refine the block.
    pickDayLabel: 'Vyber den (do 30 dní dopředu)',
  },
} as const

export type Messages = typeof cs
