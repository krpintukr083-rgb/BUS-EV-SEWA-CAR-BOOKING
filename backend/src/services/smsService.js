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

  // Normalize the recipient ONLY at the AakashSMS API boundary
  const rawRecipient = (to || '').toString().trim();
  const hasInput = rawRecipient.length > 0;
  
  // remove spaces, "-", "(", ")" and leading "+"
  let cleaned = rawRecipient.replace(/[\s\-\(\)\+]/g, '');
  
  let prefixRemoved = 'none';
  if (cleaned.startsWith('977') && cleaned.length === 13) {
    cleaned = cleaned.slice(3);
    prefixRemoved = '977';
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
    prefixRemoved = '0';
  }

  const normalizedLength = cleaned.length;
  // A valid Nepal mobile number should be exactly 10 digits and only numeric
  const isValid = normalizedLength === 10 && /^\d{10}$/.test(cleaned);

  console.log('[AAKASH_RECIPIENT_DEBUG]', {
    inputPresent: hasInput,
    normalizedLength: normalizedLength,
    prefixRemoved: prefixRemoved,
    valid: isValid
  });

  if (!isValid) {
    return {
      success: false,
      message: 'Please enter a valid Nepal mobile number.'
    };
  }

  const recipient = cleaned;

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

    const resData = response.data || {};

    console.log('[AAKASH_SMS_RESPONSE]', {
      success: resData.error === false || resData.status === 'success',
      message: resData.message,
      validCount: resData.valid_count,
      invalidCount: resData.invalid_count
    });

    if (resData.error === true || resData.message === 'No valid recipients.' || (resData.message && resData.message.toLowerCase().includes('no valid recipient'))) {
      return {
        success: false,
        message: 'Please enter a valid Nepal mobile number.'
      };
    }

    // AakashSMS v3 standard success response checking
    if (resData.error === false || resData.status === 'success' || (response.status === 200 && !resData.error)) {
      return {
        success: true,
        message: 'SMS dispatched successfully'
      };
    }

    return {
      success: false,
      message: resData.message || 'SMS gateway returned an error'
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
