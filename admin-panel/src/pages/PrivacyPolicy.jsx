import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> October 9, 2026</p>

      <p>
        This Privacy Policy describes how YatraSewanp ("we", "our", or "us") collects, uses, shares, and protects your personal information when you use the <strong>YatraSewanp Customer</strong> application (the "App"), developed for Android (package: <code>com.travelease.customer</code>) and related services.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We only collect information necessary to provide and improve our services based on the features available in the App:</p>
      <ul>
        <li><strong>Account Information:</strong> When you register, we collect your phone number (verified via OTP/SMS) and basic profile information (such as your name).</li>
        <li><strong>Booking and Payment Data:</strong> When you book a ride, we collect booking details. If payments are processed, we collect transaction information. Note that payment processing is handled securely by our integrated payment gateways.</li>
        <li><strong>Device and Usage Information:</strong> We collect basic device information (e.g., device model, OS version) and app usage data to help us troubleshoot issues and improve the app.</li>
        <li><strong>Photos and Camera (Optional):</strong> If you choose to upload a profile picture or share images (e.g., for support tickets), the app may request access to your device's camera or photo library using standard device permissions.</li>
        <li><strong>Push Notifications (Optional):</strong> With your permission, we collect necessary device tokens to send you updates regarding your bookings and promotions.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information for the following purposes:</p>
      <ul>
        <li>To create and manage your user account.</li>
        <li>To process bookings, cancellations, and manage your travel itineraries.</li>
        <li>To process payments and refunds.</li>
        <li>To send you important notifications, such as booking confirmations via push notifications or OTPs via SMS.</li>
        <li>To provide customer support and respond to your inquiries.</li>
      </ul>

      <h2>3. Sharing of Information</h2>
      <p>We do not sell your personal data. We only share information with third parties in the following circumstances:</p>
      <ul>
        <li><strong>Service Providers:</strong> We share data with trusted third-party providers who assist us with services like SMS/OTP delivery, push notifications, and payment processing.</li>
        <li><strong>Drivers/Service Operators:</strong> To facilitate your booking, relevant booking details (such as your name and pickup information) may be shared with the driver or operator assigned to your journey.</li>
        <li><strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in response to valid requests by public authorities.</li>
      </ul>

      <h2>4. Data Retention and Deletion</h2>
      <p>
        We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, or as required by law. 
      </p>
      <p>
        <strong>Account Deletion:</strong> You can request the deletion of your account and associated personal data at any time. To do so, please contact us at the email provided below or use the account deletion option within the App (if available). Upon receiving your request, we will delete your account and personal data, except for information we are legally required to retain (e.g., transaction records).
      </p>

      <h2>5. Security</h2>
      <p>
        We implement reasonable administrative and technical security measures to protect your personal information from unauthorized access, loss, or misuse. However, no data transmission over the internet or electronic storage system is 100% secure.
      </p>

      <h2>6. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If we make significant changes, we will notify you through the App or by other means before the changes take effect.
      </p>

      <h2>7. Contact Information</h2>
      <p>
        If you have any questions about this Privacy Policy, your data, or if you wish to request account deletion, please contact us:
      </p>
      <div style={{ marginTop: '16px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <p style={{ margin: '8px 0' }}>
          <strong>Email:</strong>{' '}
          <a href="mailto:krpintukr083@gmail.com" style={{ color: '#2563eb', textDecoration: 'none' }}>
            krpintukr083@gmail.com
          </a>
        </p>
        <p style={{ margin: '8px 0' }}>
          <strong>Phone:</strong>{' '}
          <a href="tel:+917482940073" style={{ color: '#2563eb', textDecoration: 'none' }}>
            +91 74829 40073
          </a>
        </p>
        <p style={{ margin: '8px 0' }}>
          <strong>Website:</strong>{' '}
          <a href="https://yatrasewanp.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
            https://yatrasewanp.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
