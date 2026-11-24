import { generatedTranslation } from './generated-translations';

const labels = {
  fr: {
    signIn: 'Connexion', signInDescription: 'Accédez à votre espace personnel.',
    email: 'Adresse e-mail', password: 'Mot de passe', signInButton: 'Se connecter',
    signInBusy: 'Connexion…', invalidCredentials: 'Identifiants incorrects ou adresse non confirmée.',
    genericError: 'Opération impossible pour le moment.', register: 'Créer un compte',
    verifyEmail: 'Confirmer mon adresse', dashboard: 'Mon espace',
    loggedIn: 'Session App vérifiée.', signOut: 'Se déconnecter',
    verifyingSession: 'Vérification de la session…', verificationTitle: 'Confirmation de l’adresse',
    verificationSuccess: 'Votre adresse a été confirmée. Vous pouvez vous connecter.',
    verificationFailed: 'Ce lien est invalide, expiré ou déjà utilisé.',
    verificationBusy: 'Confirmation en cours…', resendTitle: 'Renvoyer la confirmation',
    resendDescription: 'Saisissez votre adresse pour demander un nouveau lien de confirmation.',
    resendButton: 'Demander un nouveau lien',
    resendBusy: 'Demande en cours…',
    resendAccepted: 'Si le compte est en attente, un lien de confirmation sera envoyé.',
    backToLogin: 'Revenir à la connexion',
    forgotPassword: 'Mot de passe oublié ?', resetRequestTitle: 'Réinitialiser mon mot de passe',
    resetRequestHint: 'Un lien sera envoyé si cette adresse correspond à un compte vérifié.',
    resetRequestButton: 'Recevoir un lien', resetRequestAccepted: 'Si un compte vérifié existe, un lien vous sera envoyé.',
    resetTitle: 'Choisir un nouveau mot de passe', newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe', resetButton: 'Enregistrer le nouveau mot de passe',
    resetSuccess: 'Votre mot de passe a été modifié. Reconnectez-vous.',
    resetMismatch: 'Les deux mots de passe ne correspondent pas.',
    resetInvalidPassword: 'Respectez les critères du nouveau mot de passe.',
    resetPasswordRule: '12 caractères minimum, majuscule, minuscule, chiffre et caractère spécial.',
    passwordStrength: 'Diversité du mot de passe',
    strengthHint: 'Une phrase longue et des caractères variés sont recommandés.',
    strengthLevels: ['Aucune saisie', 'Très faible', 'Faible', 'Moyenne', 'Bonne'],
    resetInvalidToken: 'Le lien est invalide, expiré ou déjà utilisé.'
  },
  en: {
    signIn: 'Sign in', signInDescription: 'Access your personal space.',
    email: 'Email address', password: 'Password', signInButton: 'Sign in',
    signInBusy: 'Signing in…', invalidCredentials: 'Invalid credentials or unverified email.',
    genericError: 'Operation currently unavailable.', register: 'Create account',
    verifyEmail: 'Verify email', dashboard: 'My space',
    loggedIn: 'App session verified.', signOut: 'Sign out',
    verifyingSession: 'Checking session…', verificationTitle: 'Verify your email',
    verificationSuccess: 'Your email is verified. You can now sign in.',
    verificationFailed: 'This link is invalid, expired or has already been used.',
    verificationBusy: 'Verifying…', resendTitle: 'Resend verification',
    resendDescription: 'Enter your email to request a new verification link.',
    resendButton: 'Request new link',
    resendBusy: 'Requesting…',
    resendAccepted: 'If the account is pending, a verification link will be sent.',
    backToLogin: 'Back to sign in',
    forgotPassword: 'Forgot password?', resetRequestTitle: 'Reset my password',
    resetRequestHint: 'A link will be sent if this address belongs to a verified account.',
    resetRequestButton: 'Request reset link', resetRequestAccepted: 'If a verified account exists, a link will be sent.',
    resetTitle: 'Choose a new password', newPassword: 'New password',
    confirmPassword: 'Confirm password', resetButton: 'Save new password',
    resetSuccess: 'Your password was changed. Please sign in again.',
    resetMismatch: 'Passwords do not match.',
    resetInvalidPassword: 'Meet the new password requirements.',
    resetPasswordRule: 'At least 12 characters, uppercase, lowercase, digit and special character.',
    passwordStrength: 'Password diversity',
    strengthHint: 'A long passphrase with varied characters is recommended.',
    strengthLevels: ['Empty', 'Very low', 'Low', 'Moderate', 'Good'],
    resetInvalidToken: 'This link is invalid, expired or has already been used.'
  }
};
export type AuthLabels = (typeof labels)['fr'];
export function authLabels(lang: string | null | undefined): AuthLabels {
  const base = lang?.toLowerCase().split('-')[0] === 'en' ? labels.en : labels.fr;
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? value.map((entry, index) => generatedTranslation(lang, `app.auth.${key}.${index}`) ?? entry)
      : typeof value === 'string' ? (generatedTranslation(lang, `app.auth.${key}`) ?? value) : value
  ])) as AuthLabels;
}
