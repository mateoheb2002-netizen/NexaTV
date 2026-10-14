export interface FAQItem {
  question: string;
  answer: string;
}

export const HOME_FAQ_ITEMS: FAQItem[] = [
  {
    question: "Comment fonctionne l'abonnement NexaTV en France ?",
    answer:
      "NexaTV est un service d'accès télévisuel sur protocole IP. Vous recevez vos paramètres d'accès et votre configuration personnalisée suite à votre commande manuelle sur WhatsApp, sans engagement et sans prélèvement automatique.",
  },
  {
    question: "Quelles sont les formules et tarifs disponibles ?",
    answer:
      "Trois formules fixes sont proposées : Découverte (3 mois à 12 €), Standard (6 mois à 24 €) et Annuel (12 mois à 35 €). Le tarif d'entrée est de 12 € et la formule 12 mois offre le coût mensuel le plus avantageux (~2,92 €/mois).",
  },
  {
    question: "Quels appareils sont compatibles avec le service ?",
    answer:
      "Le service fonctionne sur les Smart TV (Samsung Tizen, LG webOS, Android TV), les passerelles multimédias (Chromecast, Fire TV Stick), boîtiers Android, ainsi que sur smartphones, tablettes et ordinateurs. Nous vous invitons à vérifier la compatibilité exacte de votre modèle avant toute commande.",
  },
  {
    question: "Quelle connexion internet est nécessaire pour une utilisation fluide ?",
    answer:
      "Une connexion haut débit ou très haut débit (Fibre optique, câble, ou 4G/5G stable) d'au moins 10 à 15 Mbps est recommandée pour une qualité d'image optimale en haute définition.",
  },
  {
    question: "Comment se déroule l'activation après la commande ?",
    answer:
      "L'activation est traitée manuellement par notre équipe dès réception de votre demande sur WhatsApp. Vous êtes guidé pas à pas pour la configuration de votre application préférée.",
  },
];
