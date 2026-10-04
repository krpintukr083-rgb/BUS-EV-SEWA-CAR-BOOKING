const axios = require('axios');

/**
 * Send SMS using AakashSMS API v3
 * @param {string} to - Recipient phone number
 * @param {string} text - Message content
 * @returns {Promise<{ success: boolean, message: string }>}
 */
exports.sendSms = async (to, text) => {
  const url = process.env.AAKASH_SMS_URL || 'https://sms.aakashsms.com/sms/v3/send';
  const authToken = process.env.AAKASH_SMS_AUTH_TOKEN;

  if (!authToken) {
    console.error('[SMS SERVICE ERROR] AAKASH_SMS_AUTH_TOKEN is missing in environment variables.');
    return {
      success: false,
      message: 'SMS gateway authentication token is not configured on server'
    };
  }

  // Clean recipient phone number (keep last 10 digits if national format)
  const digits = (to || '').toString().replace(/\D/g, '');
  const recipient = digits.length >= 10 ? digits.slice(-10) : digits;

  if (!recipient || recipient.length < 10) {
    return {
      success: false,
      message: 'Invalid mobile phone number format'
    };
  }

  try {
    const response = await axios.post(
      url,
      {
        auth_token: authToken,
        to: recipient,
        text: text
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const resData = response.data;

    // AakashSMS v3 standard success response checking
    if (resData && (resData.error === false || resData.status === 'success' || response.status === 200)) {
      if (resData.error === true) {
        return {
          success: false,
          message: resData.message || 'SMS delivery failed at gateway'
        };
      }
      return {
        success: true,
        message: 'SMS dispatched successfully'
      };
    }

    return {
      success: false,
      message: (resData && resData.message) ? resData.message : 'SMS gateway returned an error'
    };
  } catch (error) {
    // Log generic message to avoid printing credentials or secret tokens
    const errMsg = error.response?.data?.message || error.message || 'Network error reaching SMS gateway';
    console.error('[SMS SERVICE ERROR] Dispatch failed:', errMsg);
    return {
      success: false,
      message: 'SMS delivery service error. Please try again later.'
    };
  }
};
