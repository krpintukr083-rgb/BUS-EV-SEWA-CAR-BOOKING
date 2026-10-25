/**
 * Official Platform Contact Information
 * Used across Customer App for support, calling, and WhatsApp linking.
 */
export const OFFICIAL_CONTACT = {
  PHONE_RAW: '+9779709168447',
  PHONE_DISPLAY: '+977 970-9168447',
  PHONE_TEL: 'tel:+9779709168447',
  WHATSAPP_NUMBER: '9779709168447',
  WHATSAPP_URL: 'https://wa.me/9779709168447',
  WHATSAPP_URL_WITH_TEXT: (text) =>
    `https://wa.me/9779709168447${text ? `?text=${encodeURIComponent(text)}` : ''}`,
  SUPPORT_EMAIL: 'support@transportplatform.com',
};

export default OFFICIAL_CONTACT;
