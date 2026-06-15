export type Translations = {
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    deleting: string;
    back: string;
    close: string;
    edit: string;
    create: string;
    creating: string;
    loading: string;
    today: string;
    yesterday: string;
    all: string;
    active: string;
    paused: string;
    shared: string;
    private: string;
    copy: string;
    copied: string;
    share: string;
    sendFeedback: string;
    sending: string;
  };

  nav: {
    today: string;
    entries: string;
    goals: string;
    stats: string;
    more: string;
    mainNavLabel: string;
    desktopNavLabel: string;
  };

  workspaceSwitcher: {
    shared: string;
    private: string;
    sharedDesc: string;
    privateDesc: string;
    active: string;
    activeWorkspace: string;
    changeWorkspace: string;
    dialogDesc: string;
    switchError: string;
    switchError2: string;
    switching: string;
  };

  more: {
    profileSection: string;
    login: string;
    syncMessage: string;
    nextStepSection: string;
    workspaceSection: string;
    membersLabel: string;
    membersDetail: string;
    categoriesLabel: string;
    categoriesDetail: string;
    newWorkspaceLabel: string;
    newWorkspaceDetail: string;
    managementSection: string;
    habitsLabel: string;
    habitsDetail: string;
    presetsLabel: string;
    presetsDetail: string;
    goalsLabel: string;
    goalsDetail: string;
    analyticsSection: string;
    monthlyReportLabel: string;
    monthlyReportDetail: string;
    appSection: string;
    accountSection: string;
    deleteAccountLabel: string;
    deleteAccountDetail: string;
    logout: string;
  };

  entries: {
    searchPlaceholder: string;
    clearSearch: string;
    filterAll: string;
    filterCoffee: string;
    filterDelivery: string;
    filterShopping: string;
    filterFun: string;
    emptyTitle: string;
    emptyDesc: string;
    noResultsTitle: string;
    noResultsDesc: string;
    addFirst: string;
    loadMore: string;
    loadingMore: string;
    searching: string;
    searchError: string;
    loadError: string;
    entrySingular: string;
    entryPlural: string;
    spentLabel: string;
    netImpactLabel: string;
    todayLabel: string;
    yesterdayLabel: string;
    avoidedBadge: string;
    avoidedDesc: string;
    comparisonBadge: string;
    comparisonSaved: string;
    comparisonSpentMore: string;
    comparisonInline: string;
  };

  entryForm: {
    newTitle: string;
    editTitle: string;
    spentIntent: string;
    spentDesc: string;
    comparisonIntent: string;
    comparisonIntentLabel: string;
    comparisonDesc: string;
    jointIntent: string;
    jointDesc: string;
    jointPaymentInfo: string;
    categoryLabel: string;
    whatLabel: string;
    whatPlaceholder: string;
    amountLabel: string;
    amountPlaceholder: string;
    comparisonAmountLabel: string;
    comparisonAmountPlaceholder: string;
    toggleComparison: string;
    hideComparison: string;
    comparisonHelp: string;
    largeComparisonWarning: string;
    advancedToggle: string;
    advancedHide: string;
    dateLabel: string;
    noteLabel: string;
    notePlaceholder: string;
    paidByLabel: string;
    paidByHelp: string;
    paidByPlaceholder: string;
    appliesToLabel: string;
    appliesToHelp: string;
    appliesToSingle: string;
    appliesToMultiple: (count: number) => string;
    saveButton: string;
    savingButton: string;
    deleteButton: string;
    deletingButton: string;
    deleteConfirmHabit: string;
    deleteConfirmNormal: string;
    entryFromHabit: string;
    editDesc: string;
    registeredExpense: string;
    registeredJoint: string;
    registeredComparison: string;
  };

  quickAdd: {
    title: string;
    dialogTitle: string;
    desc: string;
    close: string;
    customize: string;
    customizeDesc: string;
    onlyRealMoney: string;
    cheaperOption: string;
    titleLabel: string;
    titlePlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    amountLabel: string;
    dateLabel: string;
    todayButton: string;
    yesterdayButton: string;
    comparisonToggle: string;
    hideComparison: string;
    comparisonAmountLabel: string;
    comparisonHelp: string;
    largeComparisonWarning: string;
    searchingSuggestion: string;
    addComparison: string;
    loadingMembers: string;
    loadingPresets: string;
    presetHelp: string;
    managePresets: string;
    fullFormLink: string;
    saveButton: string;
    savingButton: string;
    successTitle: string;
    successDesc: string;
    undoButton: string;
    undoSuccess: string;
    undoFailed: string;
    workspaceShared: string;
    workspacePrivate: string;
  };

  expenseSuggestion: {
    found: string;
    similarSingular: string;
    similarPlural: string;
    apply: string;
    addComparison: string;
  };

  dashboard: {
    spentMonth: string;
    netImpact: string;
    largeComparisons: string;
    moreThanLast: string;
    lessThanLast: string;
    thanLastMonth: string;
    realSpendingFirst: string;
    comesFirst: string;
    spentToday: string;
    entriesToday: string;
    coupleBalance: string;
    whereSpending: string;
    categoriesCount: string;
    movAbbr: string;
    streakLabel: string;
    daysLabel: string;
    habitsToday: string;
    avoidedLabel: string;
    noHabitsToday: string;
    goalsLabel: string;
    recentEntries: string;
    viewAllEntries: string;
    addEntry: string;
  };

  coupleBalance: {
    notSupported: string;
    balanced: string;
    theyOwe: (name: string) => string;
    youOwe: (name: string) => string;
    sharedOnly: string;
  };

  momentum: {
    spentToday: string;
    netImpactToday: string;
    pendingHabits: string;
    registerExpense: string;
    checkinMsgSpent: (whole: string, decimals: string, currency: string) => string;
    checkinMsgSaved: string;
    checkinMsgEmpty: string;
  };

  streakCelebration: {
    milestone: string;
    milestoneMonth: string;
    milestoneThreeWeeks: string;
    milestoneTwoWeeks: string;
    milestoneWeek: string;
    milestoneThreeDays: string;
    milestoneNewStreak: string;
    daysLabel: string;
    message: string;
    continueButton: string;
  };

  dashboardQuickActions: {
    title: string;
    desc: string;
    registerExpense: string;
    registerExpenseDesc: string;
    quickPresets: string;
    quickPresetsDesc: string;
    statistics: string;
    statisticsDesc: string;
  };

  monthlyReportPreview: {
    recentEntries: string;
    viewAll: string;
    addEntry: string;
  };

  goalsPreview: {
    title: string;
    desc: string;
    viewGoals: string;
    noGoals: string;
    goalTarget: (amount: string) => string;
  };

  goals: {
    desc: string;
    noActive: string;
    otherGoals: string;
    paused: string;
    achieved: string;
    fromPositiveImpact: string;
    monthNetImpact: string;
    closest: string;
    goalTarget: (amount: string) => string;
    pause: string;
    resume: string;
    delete: string;
    deleteConfirm: string;
    createFirst: string;
  };

  goalForm: {
    newTitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    amountLabel: (symbol: string) => string;
    amountPlaceholder: string;
    createButton: string;
    creatingButton: string;
    ideaVacation: string;
    ideaEmergency: string;
    ideaBike: string;
    ideaCourse: string;
  };

  habits: {
    todayTitle: string;
    pendingConfirm: string;
    avoidedSingular: (count: number) => string;
    avoidedPlural: (count: number) => string;
    confirmHabits: string;
    todayHabits: string;
    noTodayHabits: string;
    createHabitLink: string;
    allHabits: string;
    activeCount: string;
    monthImpact: string;
    completionLabel: string;
    spentLabel: string;
    avoidedLabel: string;
    notApplicable: string;
    monthSavings: (amount: string, month: string) => string;
    occAbbr: string;
  };

  habitCard: {
    actions: string;
    edit: string;
    delete: string;
    deleteTitle: string;
    deleteDesc: string;
    deleteOnly: string;
    deleteOnlyDesc: string;
    deleteWithEntries: string;
    deleteWithEntriesDesc: string;
    editTitle: string;
    editDesc: string;
    nameLabel: string;
    namePlaceholder: string;
    categoryLabel: string;
    amountLabel: (symbol: string) => string;
    statusActive: string;
    statusPaused: string;
    statusLabel: string;
    daysLabel: string;
    weekdays: [string, string, string, string, string, string, string];
    saveChanges: string;
    savingChanges: string;
    deleting: string;
    forLabel: string;
    forHelp: string;
    forHelpPrivate: string;
    forShared: string;
    reminderLabel: string;
    reminderOn: string;
    reminderOff: string;
    reminderHelp: string;
    reminderTimeLabel: string;
    reminderTimeHelp: string;
  };

  habitForm: {
    createTitle: string;
    createDesc: string;
    nameLabel: string;
    namePlaceholder: string;
    categoryLabel: string;
    amountLabel: (symbol: string) => string;
    amountPlaceholder: string;
    daysLabel: string;
    saveButton: string;
    savingButton: string;
    exampleCoffee: string;
    exampleCigarettes: string;
    exampleAperitivo: string;
    exampleDelivery: string;
  };

  habitOccurrence: {
    paid: string;
    avoided: string;
    notApplicable: string;
    error: string;
  };

  invites: {
    acceptanceTitle: string;
    acceptanceMessage: string;
    acceptButton: string;
    acceptingButton: string;
    linkReady: string;
    emailOnly: string;
    createLinkButton: string;
    creatingButton: string;
    emailSection: string;
    comingSoon: string;
    personalizeButton: string;
    copyButton: string;
    copiedButton: string;
    shareButton: string;
    shareTitle: string;
    shareText: string;
    inviteCreatedShared: string;
    inviteCreatedPrivate: string;
    emailPrompt: string;
    emailInvalid: string;
    inviteError: string;
    copyError: string;
    copyUnavailable: string;
    copyFailed: string;
    shareUnavailable: string;
    shareError: string;
  };

  auth: {
    loginButton: string;
    logoutButton: string;
    oauthError: string;
    loginHeadline1: string;
    loginHeadline2: string;
    loginHeadline3: string;
    loginDescription: string;
  };

  account: {
    deleteTitle: string;
    deleteConfirmHelp: string;
    deleteConfirmLabel: string;
    deleteConfirmPlaceholder: string;
    deleteButton: string;
    deletingButton: string;
  };

  feedback: {
    buttonLabel: string;
    title: string;
    desc: string;
    typeLegend: string;
    typeBug: string;
    typeSuggestion: string;
    typeConfusion: string;
    typeOther: string;
    messageLabel: string;
    messagePlaceholder: string;
    sendButton: string;
    sendingButton: string;
  };

  workspace: {
    newTitle: string;
    newDesc: string;
    activeLabel: string;
    backToPrivate: string;
    contextMsg: (name: string) => string;
    goToProfile: string;
    membersTitle: string;
    membersContext: string;
    inWorkspace: string;
    youLabel: string;
    ownerLabel: string;
    memberLabel: string;
    addPeople: string;
    addPeopleDesc: string;
    categoriesTitle: string;
    categoriesContext: string;
    loadErrorMembers: string;
    loadErrorWorkspace: string;
    loadErrorCategories: string;
  };

  subpageHeader: {
    back: string;
  };

  shared: {
    dataLoadError: string;
  };
};
