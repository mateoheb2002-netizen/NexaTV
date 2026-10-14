/**
 * Centralized device catalogue and verification status for NexaTV.
 *
 * Rules:
 * - Never equate application availability with proven NexaTV compatibility.
 * - All devices default to 'requires_verification' until testing evidence is approved.
 * - Only link to published and verified guides.
 */

export type VerificationStatus = 'requires_verification' | 'verified_compatible';

export interface DeviceRecord {
  readonly id: string;
  readonly deviceFamily: string;
  readonly platform: string;
  readonly verificationStatus: VerificationStatus;
  readonly publishedGuideUrl?: string;
  readonly verifiedNotes?: string;
  readonly osCheckInstructions: string;
  readonly modelCheckInstructions: string;
}

export const DEVICE_FAMILIES: readonly DeviceRecord[] = [
  {
    id: 'samsung-smart-tv',
    deviceFamily: 'Samsung Smart TV',
    platform: 'Tizen OS',
    verificationStatus: 'requires_verification',
    osCheckInstructions: 'Paramètres > Assistance > À propos de cette TV > Version du logiciel / Tizen',
    modelCheckInstructions: 'Étiquette constructeur à l\'arrière ou Paramètres > Assistance > À propos de cette TV (Code du modèle)',
    verifiedNotes: "La présence d'un lecteur multimédia sur le Samsung Smart Hub n'implique pas le bon décodage des flux. Un diagnostic de votre modèle exact est requis.",
  },
  {
    id: 'lg-smart-tv',
    deviceFamily: 'LG Smart TV',
    platform: 'webOS',
    verificationStatus: 'requires_verification',
    osCheckInstructions: 'Paramètres (icône roue) > Tous les paramètres > Général > À propos de ce téléviseur > Version de webOS',
    modelCheckInstructions: 'Informations sur le téléviseur > Numéro de modèle (ou étiquette à l\'arrière)',
    verifiedNotes: "Les révisions plus anciennes de webOS limitent certains codecs audio/vidéo. Nous vous invitons à confirmer la version logicielle avant toute commande.",
  },
  {
    id: 'android-google-tv',
    deviceFamily: 'Android TV / Google TV',
    platform: 'Android TV OS / Google TV',
    verificationStatus: 'requires_verification',
    osCheckInstructions: 'Paramètres > Préférences relatives à l\'appareil > À propos > Version d\'Android',
    modelCheckInstructions: 'Paramètres > Système > À propos de l\'appareil > Modèle ou référence matérielle',
    verifiedNotes: "L'écosystème Android TV regroupe une grande diversité de processeurs et de mémoires vives. Une vérification technique permet d'éviter les ralentissements.",
  },
  {
    id: 'amazon-fire-tv',
    deviceFamily: 'Amazon Fire TV',
    platform: 'Fire OS',
    verificationStatus: 'requires_verification',
    osCheckInstructions: 'Paramètres > Ma Fire TV > À propos de > Version de Fire OS',
    modelCheckInstructions: 'Paramètres > Ma Fire TV > À propos de > Nom / type de l\'appareil (Stick HD, 4K, 4K Max ou Cube)',
    verifiedNotes: "Fire OS dérive d'Android mais dispose de ses propres contraintes d'espace et de gestion thermique. Indiquez la génération exacte de votre clé HDMI au support.",
  },
] as const;
