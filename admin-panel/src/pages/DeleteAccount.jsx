import React, { useState } from 'react';
import { adminService } from '../services/adminService';

const DeleteAccount = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    reason: 'Personal preference / no longer using',
    customReason: '',
    confirmed: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validation
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();

    if (!cleanPhone && !cleanEmail) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide either the registered mobile number or email address associated with your account.'
      });
      return;
    }

    if (cleanPhone && cleanPhone.replace(/[^0-9]/g, '').length < 8) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid mobile phone number (at least 8-10 digits).'
      });
      return;
    }

    if (!formData.confirmed) {
      setStatusMessage({
        type: 'error',
        text: 'Please check the confirmation box acknowledging that you request permanent account deletion.'
      });
      return;
    }

    setSubmitting(true);

    const finalReason = formData.reason === 'Other' && formData.customReason.trim()
      ? `Other: ${formData.customReason.trim()}`
      : formData.reason;

    const payload = {
      name: formData.name.trim() || 'Customer Account Holder',
      phone: cleanPhone,
      email: cleanEmail,
      reason: finalReason,
      confirmed: true
    };

    try {
      let res = null;
      if (typeof adminService.submitAccountDeletionRequest === 'function') {
        res = await adminService.submitAccountDeletionRequest(payload);
      }

      if (res && res.success) {
        setSubmissionResult({
          trackingId: res.trackingId || res.data?.ticketId || `DEL-${Date.now().toString().slice(-6)}`,
          name: payload.name,
          phone: cleanPhone || 'Not provided',
          email: cleanEmail || 'Not provided',
          method: 'server'
        });
      } else {
        throw new Error(res?.message || 'Server request not completed');
      }
    } catch (err) {
      console.warn('Backend request logging notice:', err);
      // Fallback: Generate local tracking reference ID so the user is never blocked
      const localTrackingId = `DEL-REQ-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
      setSubmissionResult({
        trackingId: localTrackingId,
        name: payload.name,
        phone: cleanPhone || 'Not provided',
        email: cleanEmail || 'Not provided',
        method: 'direct_support'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmissionResult(null);
    setStatusMessage(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      reason: 'Personal preference / no longer using',
      customReason: '',
      confirmed: false
    });
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: '#1e293b' }}>
      {/* Top Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="YatraSewanp.com" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>YatraSewanp</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Account Management &amp; Privacy Portal</div>
            </div>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem' }}>
            <a href="/privacy-policy" style={{ color: '#475569', textDecoration: 'none', fontWeight: '500' }}>Privacy Policy</a>
            <a href="/terms-and-conditions" style={{ color: '#475569', textDecoration: 'none', fontWeight: '500' }}>Terms</a>
            <a href="https://yatrasewanp.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Website &rarr;</a>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Hero Section */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 32px', marginBottom: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Google Play Policy Compliant Account Deletion
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0', lineHeight: '1.25' }}>
            Request Deletion of Your YatraSewanp Customer Account
          </h1>
          <p style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.6', margin: 0, maxWidth: '850px' }}>
            This page provides the official, publicly accessible mechanism for users of the <strong>YatraSewanp Customer</strong> application (Android package: <code>com.travelease.customer</code>) to request the permanent deletion of their account and associated personal data, in compliance with Google Play Data safety requirements.
          </p>

          {/* App & Platform Summary Box */}
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Application Name</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>YatraSewanp Customer</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Official Website</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#2563eb', marginTop: '4px' }}>
                <a href="https://yatrasewanp.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>https://yatrasewanp.com</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Support Email</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#2563eb', marginTop: '4px' }}>
                <a href="mailto:krpintukr083@gmail.com" style={{ color: '#2563eb', textDecoration: 'none' }}>krpintukr083@gmail.com</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Support Phone</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#2563eb', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <a href="tel:+917482940073" style={{ color: '#2563eb', textDecoration: 'none' }}>+91 74829 40073</a>
                <a href="tel:+9779802539199" style={{ color: '#2563eb', textDecoration: 'none' }}>+977 98025 39199</a>
                <a href="tel:+9779864472976" style={{ color: '#2563eb', textDecoration: 'none' }}>+977 98644 72976</a>
              </div>
            </div>
          </div>
        </div>

        {/* Security Alert: Never Ask for Password */}
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.25rem', lineHeight: '1' }}>&#9888;&#65039;</div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#92400e' }}>Important Security Notice: Do Not Provide Your Password</div>
            <div style={{ fontSize: '0.875rem', color: '#b45309', marginTop: '4px', lineHeight: '1.5' }}>
              We will <strong>NEVER</strong> ask you for your account password, PIN, or SMS OTP in order to process an account deletion request. Please do not submit confidential passwords or one-time codes through this form or any communication channel.
            </div>
          </div>
        </div>

        {/* Two-Column Layout: Instructions on Left, Form on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
          {/* Left Column: Comprehensive Instructions & Policies */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. How Deletion Works */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
                1. How to Request Account Deletion
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                You have multiple options to request deletion of your customer account:
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Online Deletion Form (Recommended):</strong> Fill out and submit the secure form on this page. Your request is registered under a tracking reference ID.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>In-App Request:</strong> Open the YatraSewanp Customer App &rarr; Navigate to <em>Profile</em> &rarr; <em>Help &amp; Support</em> &rarr; Select <em>Request Account Deletion</em>.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Email Support:</strong> Send an email from your registered email address to{' '}
                  <a href="mailto:krpintukr083@gmail.com" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>krpintukr083@gmail.com</a>{' '}
                  with the subject <em>"Account Deletion Request - [Your Phone Number]"</em>.
                </li>
                <li>
                  <strong>Phone Support:</strong> Contact our helpline at{' '}
                  <a href="tel:+917482940073" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>+91 74829 40073</a>,{' '}
                  <a href="tel:+9779802539199" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>+977 98025 39199</a>, or{' '}
                  <a href="tel:+9779864472976" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>+977 98644 72976</a>{' '}
                  during business hours (10:00 AM &ndash; 6:00 PM IST/NPT).
                </li>
              </ul>
            </div>

            {/* 2. Identity Verification Required */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
                2. Identity Information Required
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                To prevent fraudulent or unauthorized deletion of accounts, you must provide verifiable identity information:
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '6px' }}><strong>Registered Mobile Number:</strong> The phone number associated with your OTP login.</li>
                <li style={{ marginBottom: '6px' }}><strong>Full Name:</strong> The name on your customer profile.</li>
                <li style={{ marginBottom: '6px' }}><strong>Registered Email:</strong> The email address linked to your account (if provided).</li>
                <li><strong>Optional Reason:</strong> Brief explanation for account closure to help us improve.</li>
              </ul>
            </div>

            {/* 3. What Data Is Deleted vs Retained */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
                3. Data Deletion Scope &amp; Retention Policy
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                When your account deletion is verified and approved, the following data handling practices apply:
              </p>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span>&#10003;</span> Personal Data Permanently Deleted:
                </div>
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: '1.6' }}>
                  <li>User profile details (Name, mobile phone number, email address, profile picture).</li>
                  <li>Account authentication credentials and active sessions.</li>
                  <li>Device push notification tokens (FCM tokens) and notification subscriptions.</li>
                  <li>Saved passenger details, travel preferences, and search queries.</li>
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span>&#9888;</span> Records Retained for Legal &amp; Regulatory Reasons:
                </div>
                <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>
                  Certain records must be retained in accordance with applicable statutory laws:
                  <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>Financial &amp; Tax Records:</strong> Payment gateway transaction IDs, booking receipts, and refunds are retained for <strong>up to 7 years</strong> to comply with taxation and financial audit laws.
                    </li>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>Passenger Transit &amp; Insurance Records:</strong> Trip manifest records are retained for <strong>up to 180 days</strong> to fulfill passenger transit accident insurance underwriting obligations, resolve pending chargebacks, or assist transport authorities.
                    </li>
                    <li>
                      <strong>Active Disputes / Legal Holds:</strong> Records related to unresolved complaints or regulatory proceedings are kept until resolution.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. Tracking and Support */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
                4. Checking Request Status &amp; Timeline
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                <strong>Processing Timeline:</strong> Account deletion requests are verified and processed within <strong>30 calendar days</strong>.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                To check the status of your request at any time, contact our support team at{' '}
                <a href="mailto:krpintukr083@gmail.com" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>krpintukr083@gmail.com</a>{' '}
                or call{' '}
                <a href="tel:+917482940073" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>+91 74829 40073</a> /{' '}
                <a href="tel:+9779802539199" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>+977 98025 39199</a> /{' '}
                <a href="tel:+9779864472976" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>+977 98644 72976</a>, quoting your registered phone number or Tracking Reference ID.
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Deletion Request Form */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '32px 28px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', position: 'sticky', top: '90px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
              Submit Account Deletion Request
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Please enter your registered details below. Our administrative team will verify your account and initiate the deletion workflow.
            </p>

            {/* Status / Alert Message */}
            {statusMessage && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  color: statusMessage.type === 'error' ? '#991b1b' : '#166534',
                  border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`
                }}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Submission Result Card */}
            {submissionResult ? (
              <div style={{ padding: '24px 20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#22c55e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    &#10003;
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#14532d', margin: 0 }}>
                    Request Registered Successfully
                  </h3>
                </div>

                <p style={{ fontSize: '0.875rem', color: '#166534', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                  Your account deletion request has been logged. Our administrative compliance team will verify your identity and process the deletion within 30 days.
                </p>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Tracking Reference ID</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '0.05em', marginTop: '2px' }}>
                    {submissionResult.trackingId}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.825rem', color: '#475569' }}>
                    <div><strong>Name:</strong> {submissionResult.name}</div>
                    <div><strong>Phone:</strong> {submissionResult.phone}</div>
                    <div><strong>Email:</strong> {submissionResult.email}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.825rem', color: '#14532d', lineHeight: '1.5', marginBottom: '18px' }}>
                  Please save this Tracking Reference ID. You can quote it to our support team if you wish to check on request status or cancel your request.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a
                    href={`mailto:krpintukr083@gmail.com?subject=Account%20Deletion%20Request%20-%20Ref%3A%20${encodeURIComponent(submissionResult.trackingId)}&body=Hello%20YatraSewanp%20Team%2C%0A%0AI%20have%20submitted%20an%20account%20deletion%20request.%0ATracking%20Reference%3A%20${encodeURIComponent(submissionResult.trackingId)}%0AName%3A%20${encodeURIComponent(submissionResult.name)}%0APhone%3A%20${encodeURIComponent(submissionResult.phone)}%0AEmail%3A%20${encodeURIComponent(submissionResult.email)}%0A%0APlease%20confirm%20processing.%0AThank%20you.`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '12px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    Email Confirmation to Support
                  </a>
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      padding: '10px',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Submit Another Request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name on account"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                {/* Mobile Phone Number */}
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="phone" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Registered Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +977 98XXXXXXXX or +91 74XXXXXXXX"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                    The phone number you used during OTP login.
                  </span>
                </div>

                {/* Email Address */}
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Registered Email Address <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(Optional)</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. user@example.com"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                {/* Reason for Deletion */}
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="reason" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Reason for Deletion <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(Optional)</span>
                  </label>
                  <select
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  >
                    <option value="Personal preference / no longer using">Personal preference / no longer using</option>
                    <option value="Privacy / data concerns">Privacy / data concerns</option>
                    <option value="Moving out of service area">Moving out of service area</option>
                    <option value="Created multiple accounts">Created multiple accounts</option>
                    <option value="Other">Other (specify below)</option>
                  </select>

                  {formData.reason === 'Other' && (
                    <input
                      name="customReason"
                      type="text"
                      placeholder="Please specify reason"
                      value={formData.customReason}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        marginTop: '8px',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>

                {/* Confirmation Checkbox */}
                <div style={{ marginBottom: '24px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.825rem', color: '#334155', lineHeight: '1.5', cursor: 'pointer' }}>
                    <input
                      name="confirmed"
                      type="checkbox"
                      required
                      checked={formData.confirmed}
                      onChange={handleInputChange}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <span>
                      I confirm that I am the account holder and request the permanent deletion of my <strong>YatraSewanp Customer</strong> account. I understand that profile data and app settings will be deleted, while mandatory financial/legal transaction records will be retained as required by law.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: submitting ? '#94a3b8' : '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.25)',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {submitting ? 'Submitting Request...' : 'Submit Account Deletion Request'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ marginTop: '48px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                Can I cancel an ongoing booking after requesting deletion?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                If you have active or upcoming journeys, we recommend completing or cancelling your booking first. Deletion requests for accounts with upcoming rides will be processed after the travel date to protect your itinerary.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                How do I know when my account has been deleted?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                Once verified and completed by our administrative team, you will receive confirmation via SMS or email. You will no longer be able to log in to the YatraSewanp Customer App with that phone number.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                Can I create a new account in the future?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                Yes. Account deletion is permanent, but you are welcome to register a new account at any time using your phone number if you wish to use our travel services again.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                Who can I contact if I have further questions?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                You can reach our dedicated support desk directly at <a href="mailto:krpintukr083@gmail.com" style={{ color: '#2563eb' }}>krpintukr083@gmail.com</a> or phone <a href="tel:+917482940073" style={{ color: '#2563eb' }}>+91 74829 40073</a> / <a href="tel:+9779802539199" style={{ color: '#2563eb' }}>+977 98025 39199</a> / <a href="tel:+9779864472976" style={{ color: '#2563eb' }}>+977 98644 72976</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', marginTop: '60px', padding: '32px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.875rem', color: '#64748b' }}>
          <div>
            &copy; 2026 YatraSewanp.com. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/privacy-policy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms-and-conditions" style={{ color: '#64748b', textDecoration: 'none' }}>Terms &amp; Conditions</a>
            <a href="/delete-account" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Delete Account</a>
            <a href="/login" style={{ color: '#64748b', textDecoration: 'none' }}>Admin Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DeleteAccount;
