import React from 'react';

const TermsAndConditions = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Terms and Conditions</h1>
      <p><strong>Effective Date:</strong> October 9, 2026</p>

      <h2>1. Introduction</h2>
      <p>Welcome to YatraSewanp.com. By accessing or using our application, you agree to be bound by these Terms and Conditions.</p>
      
      <h2>2. Services Provided</h2>
      <p>YatraSewanp.com provides a platform to facilitate transport bookings including Bus, EV-Sewa, and Car reservations. We connect customers with service operators and drivers.</p>
      
      <h2>3. User Responsibilities</h2>
      <p>You agree to use our application for lawful purposes only and to provide accurate information when creating an account or making a booking.</p>
      
      <h2>4. Developer Independence and Unauthorized Conduct</h2>
      <p>
        Unless otherwise expressly agreed in a written contract, the technical developer's role is limited to the development, maintenance, or technical support of the software services assigned to them. The app owner/operator (YatraSewanp.com) is responsible for its business operations, management of employees, customer interactions, bookings, payments, and the conduct of personnel acting under its direction or control.
      </p>
      <p>
        The developer does not authorize, direct, participate in, or endorse any criminal, fraudulent, abusive, or otherwise unlawful activity by the app owner, its employees, contractors, or other persons. Any such activity undertaken without the developer's knowledge, authorization, direction, or participation is not an activity approved by the developer.
      </p>
      <p>
        Suspected unlawful conduct should be reported to the app owner/operator and, where appropriate, the competent authorities. Nothing in this disclaimer excludes or limits any liability, duty, or legal responsibility that cannot lawfully be excluded under applicable law.
      </p>
      
      <h2>5. Changes to Terms</h2>
      <p>We reserve the right to modify these terms at any time. Your continued use of the application constitutes your acceptance of the new terms.</p>
      
      <h2>6. Contact Information</h2>
      <p>For any questions regarding these Terms and Conditions or our services, please contact us:</p>
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

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.9rem' }}>
        <a href="/privacy-policy" style={{ color: '#2563eb', textDecoration: 'none' }}>&larr; Privacy Policy</a>
        <a href="/delete-account" style={{ color: '#dc2626', textDecoration: 'none', fontWeight: '600' }}>Delete Account Portal &rarr;</a>
      </div>
    </div>
  );
};

export default TermsAndConditions;
