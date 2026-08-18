export const LISTING_REPORT_REASONS = Object.freeze([
  { value: 'Fraude o estafa', labelKey: 'report_reason_fraud' },
  { value: 'Contenido inapropiado', labelKey: 'report_reason_inappropriate' },
  { value: 'Artículo falso o falsificado', labelKey: 'report_reason_counterfeit' },
  { value: 'Ya se vendió', labelKey: 'sold_status' },
  { value: 'Otro', labelKey: 'report_reason_other' },
]);

export const USER_REPORT_REASONS = Object.freeze([
  { value: 'Comportamiento abusivo', labelKey: 'report_reason_abusive' },
  { value: 'Sospecha de fraude', labelKey: 'report_reason_suspected_fraud' },
  { value: 'Vende productos ilegales', labelKey: 'report_reason_prohibited_products' },
  { value: 'Suplantación de identidad', labelKey: 'report_reason_impersonation' },
  { value: 'Otro', labelKey: 'report_reason_other' },
]);
