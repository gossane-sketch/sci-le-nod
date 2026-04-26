export const PROFILES = [
  { id: 'frederique', name: 'Frédérique', short: 'Fré', pets: '3 chats', petIcon: '🐱', color: '#C4873B', bg: '#FEF3E2' },
  { id: 'raphael',    name: 'Raphaël',    short: 'Raph', pets: '3 chats', petIcon: '🐱', color: '#8B5E3C', bg: '#F5EDD8' },
  { id: 'jose',       name: 'José',       short: 'José', pets: '2 chats', petIcon: '🐱', color: '#4A7C59', bg: '#E8F5EE' },
  { id: 'virginia',   name: 'Virginia',   short: 'Virg', pets: '1 chien', petIcon: '🐶', color: '#2D6A8F', bg: '#E3F0F8' },
]

export const getProfile = (id) => PROFILES.find(p => p.id === id) || PROFILES[0]

export const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const DAYS_FR = ['Lu','Ma','Me','Je','Ve','Sa','Di']
