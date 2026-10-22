const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export const fr = {
  common: {
    siteName: "Bien-aimés",
    tagline: "La Parole qui nous rassemble.",
    skipToContent: "Aller au contenu",
    demoData: "Données de démonstration",
    close: "Fermer",
    cancel: "Annuler",
    back: "Retour",
    optional: "facultatif",
    required: "obligatoire",
  },
  nav: {
    primary: "Navigation principale",
    home: "Accueil",
    sermons: "Prédications",
    about: "À propos",
    login: "Espace équipe",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    language: "Langue",
    switchTo: (lang: string) => `Passer en ${lang}`,
  },
  footer: {
    description:
      "Les prédications de l'église, archivées pour être écoutées, retrouvées et partagées.",
    explore: "Explorer",
    team: "Équipe",
    dashboard: "Tableau de bord",
    copyright: (year: number) => `© ${year} Bien-aimés. Tous droits réservés.`,
    demoNotice:
      "Version de démonstration : les prédications affichées sont des exemples fictifs.",
  },
  home: {
    hero: {
      eyebrow: "Archive des prédications",
      title: "Nourrissez votre foi, où que vous soyez.",
      subtitle:
        "Chaque prédication de l'église est archivée ici, avec ses versets et ses enregistrements, pour que vous puissiez l'écouter à nouveau et la retrouver facilement.",
      primaryCta: "Explorer les prédications",
      secondaryCta: "À propos de Bien-aimés",
      visualLabel:
        "Illustration : vitrail en arc d'une église traversé par la lumière",
      archive: "L'archive",
      archiveSermons: (n: number) => `${n} ${plural(n, "prédication", "prédications")}`,
      archiveFiles: (n: number) => `${n} ${plural(n, "enregistrement", "enregistrements")}`,
      archiveSince: (date: string) => `Depuis ${date}`,
    },
    featured: {
      eyebrow: "À la une",
      title: "La prédication la plus récente",
      listen: "Écouter",
      details: "Voir la prédication",
    },
    latest: {
      eyebrow: "Archive",
      title: "Dernières prédications",
      description:
        "Les messages des derniers dimanches, avec leurs références bibliques et leurs enregistrements.",
      viewAll: "Voir toutes les prédications",
    },
    verse: {
      eyebrow: "Méditation",
      exampleNote: "Verset d'exemple",
    },
  },
  sermon: {
    preacher: "Prédicateur",
    references: "Références bibliques",
    date: "Date",
    duration: "Durée",
    durationUnknown: "Durée inconnue",
    recordings: (n: number) =>
      n === 0 ? "Aucun enregistrement" : `${n} ${plural(n, "enregistrement", "enregistrements")}`,
    noAudio: "Aucun enregistrement",
    language: "Langue",
    languageNames: { fr: "Français", en: "Anglais" },
    listen: "Écouter",
    open: (title: string) => `Ouvrir la prédication « ${title} »`,
  },
  library: {
    eyebrow: "Bibliothèque",
    title: "Toutes les prédications",
    description:
      "Recherchez un message par thème, par passage biblique ou par prédicateur, puis affinez par période.",
    filters: "Filtres",
    searchLabel: "Rechercher",
    searchPlaceholder: "Thème, verset, prédicateur…",
    clearSearch: "Effacer la recherche",
    yearLabel: "Année",
    allYears: "Toutes les années",
    monthLabel: "Mois",
    allMonths: "Tous les mois",
    languageLabel: "Langue",
    allLanguages: "Toutes les langues",
    sortLabel: "Trier",
    newest: "Plus récentes d'abord",
    oldest: "Plus anciennes d'abord",
    results: (n: number) =>
      n === 0 ? "Aucun résultat" : `${n} ${plural(n, "prédication", "prédications")}`,
    clearFilters: "Effacer les filtres",
    archiveEmpty: "Aucune prédication publiée pour le moment",
    archiveEmptyText: "Les prédications apparaîtront ici dès leur publication par l'équipe.",
    emptyTitle: "Aucune prédication ne correspond",
    emptyText:
      "Essayez un autre mot-clé, vérifiez l'orthographe du livre biblique ou élargissez la période.",
    loadMore: "Afficher plus",
    showing: (shown: number, total: number) => `${shown} sur ${total}`,
  },
  detail: {
    backToLibrary: "Toutes les prédications",
    notes: "Notes",
    recordings: "Enregistrements",
    recordingsEmpty:
      "Aucun enregistrement n'est encore associé à cette prédication.",
    nowPlaying: "En lecture",
    select: (name: string) => `Sélectionner « ${name} »`,
    download: "Télécharger",
    downloadUnavailable: "Téléchargement non autorisé",
    related: "À écouter aussi",
    notFoundTitle: "Prédication introuvable",
    notFoundText:
      "Cette prédication n'existe pas ou a été retirée de l'archive. Vérifiez le lien ou parcourez la bibliothèque.",
  },
  player: {
    play: "Lire",
    pause: "Pause",
    rewind: "Reculer de 15 secondes",
    forward: "Avancer de 30 secondes",
    seek: "Position de lecture",
    unavailableTitle: "Enregistrement non disponible",
    unavailableText:
      "Le fichier audio n'est pas encore hébergé. Il sera disponible après la mise en ligne de l'archive.",
    error:
      "Lecture impossible : ce format n'est peut-être pas pris en charge par votre navigateur.",
    loading: "Chargement…",
  },
  about: {
    eyebrow: "À propos",
    title: "Garder la Parole à portée d'oreille.",
    lead: "Bien-aimés est une plateforme d'archivage des prédications d'une église locale. Elle permet d'écouter de nouveau un message, de retrouver un passage étudié et de le partager.",
    sections: [
      {
        title: "Pourquoi une archive",
        text: "Une prédication s'écoute souvent une seule fois. L'archive permet d'y revenir dans la semaine, de rattraper un dimanche manqué ou de réécouter un passage qui a marqué.",
      },
      {
        title: "Comment elle est organisée",
        text: "Chaque prédication est rattachée à sa date, à ses références bibliques et, si elle est connue, au nom de la personne qui a prêché. Une même prédication peut réunir plusieurs enregistrements.",
      },
      {
        title: "Qui la gère",
        text: "Seuls les membres autorisés de l'équipe ajoutent et modifient les prédications depuis l'espace d'administration.",
      },
    ],
    statusTitle: "État du projet",
    statusText:
      "Cette version est une première étape : les prédications présentées sont des exemples, et l'hébergement des fichiers audio ainsi que l'authentification de l'équipe seront mis en place prochainement.",
    cta: "Parcourir les prédications",
  },
  login: {
    eyebrow: "Espace équipe",
    title: "Connexion",
    subtitle:
      "Réservé aux membres autorisés qui gèrent l'archive des prédications.",
    email: "Adresse e-mail",
    emailPlaceholder: "nom@exemple.org",
    password: "Mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    submit: "Se connecter",
    submitting: "Connexion…",
    errors: {
      emailRequired: "Saisissez votre adresse e-mail.",
      emailInvalid: "Cette adresse e-mail ne semble pas valide.",
      passwordRequired: "Saisissez votre mot de passe.",
      summary: "Le formulaire contient des erreurs.",
    },
    authErrors: {
      invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
      emailNotConfirmed:
        "Cette adresse e-mail n'a pas encore été confirmée. Consultez le message reçu lors de la création du compte.",
      rateLimited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
      network: "Impossible de joindre le serveur. Vérifiez votre connexion internet.",
      unknown: "La connexion a échoué. Réessayez.",
    },
    notConfiguredTitle: "Connexion indisponible",
    notConfiguredText:
      "Supabase n'est pas encore configuré pour ce site : renseignez les variables de .env.local (voir supabase/README.md).",
    successTitle: "Connexion réussie",
    successText: "Ouverture du tableau de bord…",
    accountsNote:
      "Les comptes sont créés par un administrateur. Il n'existe pas d'inscription publique.",
    backToSite: "Retour au site",
    quote: "Que la parole de Christ habite parmi vous abondamment.",
    quoteRef: "Colossiens 3:16",
  },
  admin: {
    nav: {
      label: "Navigation de l'administration",
      overview: "Vue d'ensemble",
      sermons: "Prédications",
      newSermon: "Nouvelle prédication",
      collaborators: "Collaborateurs",
        viewSite: "Voir le site",
      menu: "Menu",
      signOut: "Se déconnecter",
    },
    roles: { admin: "Administrateur", member: "Membre de l'équipe" },
    status: { published: "Publiée", draft: "Brouillon" },
    setup: {
      title: "Supabase n'est pas encore configuré",
      text: "L'espace d'administration a besoin de la base de données et de l'authentification Supabase. Suivez le guide supabase/README.md :",
      steps: [
        "Créer un projet sur supabase.com.",
        "Exécuter supabase/schema.sql dans l'éditeur SQL.",
        "Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local.",
        "Créer votre compte, puis vous déclarer administrateur.",
        "Redémarrer le serveur (npm run dev).",
      ],
    },
    denied: {
      title: "Accès réservé à l'équipe",
      text: (email: string) =>
        `Le compte ${email} est bien connecté, mais il ne fait pas partie de l'équipe. Demandez à un administrateur de vous ajouter.`,
    },
    loadError:
      "Les données n'ont pas pu être chargées. Vérifiez la configuration Supabase puis réessayez.",
    retry: "Réessayer",
    overview: {
      title: "Vue d'ensemble",
      subtitle: "État actuel de l'archive des prédications.",
      sermons: "Prédications",
      audioFiles: "Fichiers audio",
      totalDuration: "Durée enregistrée",
      withoutAudio: "Sans enregistrement",
      durationHint: (n: number) =>
        n === 0
          ? "Toutes les durées sont connues"
          : `${n} ${plural(n, "fichier", "fichiers")} sans durée connue`,
      sermonsHint: (published: number, drafts: number) =>
        `${published} ${plural(published, "publiée", "publiées")} · ${drafts} ${plural(drafts, "brouillon", "brouillons")}`,
      filesHint: "Associés aux prédications",
      withoutAudioHint: "À compléter",
      recent: "Ajoutées récemment",
      viewAll: "Tout voir",
      add: "Ajouter une prédication",
      empty: "Aucune prédication pour le moment.",
    },
    sermons: {
      title: "Prédications",
      subtitle: (n: number) =>
        `${n} ${plural(n, "prédication", "prédications")} dans l'archive.`,
      add: "Nouvelle prédication",
      search: "Filtrer par thème, verset ou prédicateur",
      columns: {
        sermon: "Prédication",
        date: "Date",
        audio: "Audio",
        actions: "Actions",
      },
      view: "Voir sur le site",
      edit: "Modifier",
      delete: "Supprimer",
      empty: "Aucune prédication ne correspond à ce filtre.",
      deleteTitle: "Supprimer cette prédication ?",
      deleteText: (title: string) =>
        `« ${title} » et tous ses fichiers audio seront supprimés définitivement. Cette action est irréversible.`,
      deleteConfirm: "Supprimer définitivement",
      deleting: "Suppression…",
      deleted: (title: string) => `« ${title} » a été supprimée.`,
      deleteAdminOnly: "Seuls les administrateurs peuvent supprimer une prédication.",
      notFound: "Cette prédication n'existe pas ou a été supprimée.",
      statusColumn: "Statut",
    },
    collaborators: {
      title: "Collaborateurs",
      subtitle: "Gestion des accès de l'équipe.",
      you: "Vous",
      columns: { email: "Compte", role: "Rôle", since: "Depuis" },
      rolesTitle: "Les rôles",
      rolesText: [
        "Administrateur : gère les prédications, peut les supprimer et voit toute l'équipe.",
        "Membre de l'équipe : ajoute et modifie les prédications, sans pouvoir les supprimer.",
        "Compte inscrit hors équipe : aucun droit de gestion.",
      ],
      memberNotice: "Seuls les administrateurs voient la liste complète de l'équipe.",
      howToAdd:
        "Pour ajouter quelqu'un : créez son compte dans Supabase › Authentication › Users, puis exécutez la requête « Ajouter un membre » en bas de supabase/schema.sql. L'invitation depuis cette page viendra dans une prochaine étape.",
    },
  },
  form: {
    newTitle: "Nouvelle prédication",
    newSubtitle:
      "Renseignez les informations de la prédication et ajoutez ses enregistrements.",
    editTitle: "Modifier la prédication",
    editSubtitle: "Mettez à jour les informations et les enregistrements.",
    sections: {
      details: "Informations",
      detailsHint: "Les champs marqués d'un astérisque sont obligatoires.",
      audio: "Enregistrements",
      audioHint:
        "Importez un ou plusieurs fichiers, ou enregistrez directement depuis ce navigateur.",
      publication: "Publication",
      publicationHint: "Langue du message et visibilité sur le site public.",
    },
    language: "Langue de la prédication",
    languages: { fr: "Français", en: "Anglais" },
    published: "Publier sur le site",
    publishedHint: "Visible par tous les visiteurs dès l'enregistrement.",
    draftHint: "Brouillon : visible uniquement par l'équipe.",
    uploading: (current: number, total: number) => `Téléversement du fichier ${current} sur ${total}…`,
    saving: "Enregistrement…",
    saveErrors: {
      title: "L'enregistrement a échoué",
      notConfigured: "Supabase n'est pas configuré.",
      unauthorized:
        "Votre session a expiré ou votre compte n'a pas accès à l'administration. Reconnectez-vous.",
      forbidden: "Votre rôle ne permet pas cette action.",
      invalid: "Certaines informations sont invalides. Vérifiez le formulaire.",
      notFound: "Cette prédication n'existe plus.",
      server: "Erreur du serveur. Réessayez dans un instant.",
      upload: "Le téléversement d'un fichier audio a échoué. Aucun changement n'a été enregistré.",
      uploadTooLarge:
        "Un fichier dépasse la taille autorisée par le stockage. Aucun changement n'a été enregistré.",
    },
    date: "Date de la prédication",
    title: "Thème",
    titlePlaceholder: "Ex. La foi qui déplace les montagnes",
    references: "Références bibliques",
    referencesHint: "Une référence par ligne, ex. Matthieu 17:20.",
    referencePlaceholder: "Livre chapitre:verset",
    referenceLabel: (n: number) => `Référence ${n}`,
    addReference: "Ajouter une référence",
    removeReference: (n: number) => `Retirer la référence ${n}`,
    preacher: "Prédicateur",
    preacherPlaceholder: "Nom de la personne qui a prêché",
    notes: "Notes complémentaires",
    notesPlaceholder: "Plan du message, points clés, contexte…",
    errors: {
      dateRequired: "Indiquez la date de la prédication.",
      dateInvalid: "Cette date n'est pas valide.",
      titleRequired: "Indiquez le thème de la prédication.",
      titleTooLong: "Le thème ne doit pas dépasser 160 caractères.",
      referencesRequired: "Ajoutez au moins une référence biblique.",
      referenceEmpty: "Complétez ou retirez cette référence vide.",
      summary: (n: number) =>
        `${n} ${plural(n, "champ à corriger", "champs à corriger")} avant de continuer.`,
      recordingInProgress:
        "Terminez ou arrêtez l'enregistrement en cours avant de valider.",
    },
    submitNew: "Valider la prédication",
    submitEdit: "Enregistrer les modifications",
    cancel: "Annuler",
    savedTitle: "Prédication enregistrée",
    savedText: (files: number, published: boolean) =>
      `${files} ${plural(files, "fichier audio", "fichiers audio")} · ${published ? "publiée sur le site" : "enregistrée en brouillon"}.`,
    viewList: "Voir la liste",
    viewOnSite: "Voir sur le site",
    addAnother: "Ajouter une autre prédication",
  },
  upload: {
    dropTitle: "Déposez vos fichiers audio ici",
    dropHint: (mb: number) => `MP3, M4A, WAV, OGG, WEBM… jusqu'à ${mb} Mo par fichier.`,
    browse: "Choisir des fichiers",
    invalidType: (name: string) =>
      `« ${name} » n'est pas un fichier audio reconnu.`,
    tooLarge: (name: string, mb: number) => `« ${name} » dépasse la taille maximale de ${mb} Mo.`,
    listTitle: (n: number) =>
      n === 0 ? "Aucun fichier sélectionné" : `${n} ${plural(n, "fichier sélectionné", "fichiers sélectionnés")}`,
    listEmpty:
      "Les fichiers importés et les enregistrements apparaîtront ici. Vous pourrez les écouter avant de valider.",
    remove: (name: string) => `Retirer « ${name} »`,
    rename: (name: string) => `Nom de l'enregistrement « ${name} »`,
    sourceImport: "Importé",
    sourceRecording: "Enregistré",
    listen: "Écouter",
    hide: "Masquer le lecteur",
    existing: "Déjà dans l'archive",
  },
  recorder: {
    title: "Enregistrer depuis le navigateur",
    states: {
      idle: "Prêt",
      requesting: "Autorisation du micro…",
      recording: "Enregistrement en cours",
      paused: "En pause",
      stopped: "Terminé",
    },
    start: "Démarrer",
    pause: "Mettre en pause",
    resume: "Reprendre",
    stop: "Arrêter",
    newRecording: "Nouvel enregistrement",
    duration: "Durée de l'enregistrement",
    format: (mime: string) => `Format : ${mime}`,
    added: "L'enregistrement a été ajouté à la liste des fichiers.",
    level: "Niveau du micro",
    microphone: "Micro",
    defaultMicrophone: "Micro par défaut du système",
    noSignal: "Aucun son détecté : parlez près du micro ou choisissez-en un autre après l'arrêt.",
    silentTitle: "Aucun son n'a été capté",
    silentText:
      "Le fichier a été ajouté mais il est silencieux. Vérifiez que le bon micro est choisi ci-dessus, qu'il n'est pas coupé et que son volume d'entrée n'est pas à zéro (Windows : Paramètres › Système › Son › Entrée ; Mac : Réglages › Son › Entrée). Retirez ensuite ce fichier de la liste et recommencez.",
    defaultName: (n: number) => `Enregistrement ${n}`,
    insecureTitle: "Micro bloqué : connexion non sécurisée",
    insecureText: (current: string, local: string) =>
      `Les navigateurs n'autorisent le micro qu'en HTTPS ou sur localhost. Vous consultez le site via ${current}. Sur cet ordinateur, ouvrez plutôt ${local}. Sur un téléphone, il faut une adresse HTTPS (le site en ligne, ou « npx next dev --experimental-https » en développement). L'import de fichiers fonctionne dans tous les cas.`,
    errors: {
      unsupported:
        "Ce navigateur ne permet pas l'enregistrement audio. Utilisez une version récente de Chrome, Edge, Firefox ou Safari, ou importez un fichier.",
      insecure:
        "L'accès au micro nécessite une connexion sécurisée (HTTPS) ou localhost.",
      permissionDenied:
        "L'accès au micro a été refusé. Autorisez-le dans les réglages du navigateur pour ce site, puis réessayez.",
      noMicrophone: "Aucun micro n'a été détecté sur cet appareil.",
      inUse:
        "Le micro est déjà utilisé par une autre application ou n'est pas accessible.",
      empty: "L'enregistrement est vide. Réessayez en parlant près du micro.",
      generic: "L'enregistrement a échoué. Réessayez.",
    },
  },
  errorPage: {
    title: "Une erreur est survenue",
    text: "Le contenu n'a pas pu être chargé. Vérifiez votre connexion, puis réessayez.",
    retry: "Réessayer",
  },
  notFound: {
    title: "Page introuvable",
    text: "La page demandée n'existe pas ou a été déplacée.",
    home: "Retour à l'accueil",
  },
};

export type Dictionary = typeof fr;
