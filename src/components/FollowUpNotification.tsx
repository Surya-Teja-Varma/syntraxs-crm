import { useEffect, useState } from 'react';
import { Bell, Phone, User, X } from 'lucide-react';
import { Lead } from '../types';

interface FollowUpNotificationProps {
    lead: Lead;
    minutesRemaining: number;
    onDismiss: () => void;
}

export function FollowUpNotification({ lead, minutesRemaining, onDismiss }: FollowUpNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const showTimer = setTimeout(() => setIsVisible(true), 100);

        // CRITICAL: Auto-dismiss after exactly 30 seconds
        const dismissTimer = setTimeout(() => {
            handleDismiss();
        }, 30000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, []); // Empty dependency array = runs once on mount

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            onDismiss();
        }, 400);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: isVisible && !isExiting ? 'translateX(-50%)' : 'translate(-50%, -150%)',
                zIndex: 999999,
                width: '380px',
                maxWidth: '90vw',
                transition: 'all 0.5s ease-out',
                opacity: isVisible && !isExiting ? 1 : 0,
                fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
            }}
        >
            {/* Main Card with Gradient Border */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)',
                    borderRadius: '16px',
                    padding: '2px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6), 0 0 30px rgba(245, 158, 11, 0.4)'
                }}
            >
                {/* Inner Content - Dark Background */}
                <div
                    style={{
                        background: '#0f172a',
                        borderRadius: '14px',
                        padding: '20px',
                        color: '#ffffff',
                        position: 'relative'
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <div
                            style={{
                                width: '44px',
                                height: '44px',
                                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
                                flexShrink: 0
                            }}
                        >
                            <Bell size={22} color="#ffffff" style={{ animation: 'wiggle 1s ease-in-out infinite' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff', lineHeight: '1.3' }}>
                                Follow-up Reminder
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#fbbf24', fontWeight: '600' }}>
                                {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''} until follow-up
                            </p>
                        </div>
                    </div>

                    {/* Lead Info Card */}
                    <div
                        style={{
                            background: 'rgba(30, 41, 59, 0.7)',
                            borderRadius: '10px',
                            padding: '14px',
                            marginBottom: '14px',
                            border: '1px solid rgba(71, 85, 105, 0.5)'
                        }}
                    >
                        {/* Company Name */}
                        <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(71, 85, 105, 0.4)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                COMPANY
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>
                                {lead.companyName}
                            </div>
                        </div>

                        {/* Client Name */}
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                CLIENT NAME
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: '500' }}>{lead.contactName}</span>
                            </div>
                        </div>

                        {/* Mobile Number */}
                        <div>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                MOBILE NUMBER
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={16} color="#4ade80" style={{ flexShrink: 0 }} />
                                <a
                                    href={`tel:${lead.phone}`}
                                    style={{ fontSize: '15px', color: '#e2e8f0', textDecoration: 'none', fontWeight: '500' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#fbbf24'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#e2e8f0'}
                                >
                                    {lead.phone}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <button
                            onClick={handleDismiss}
                            style={{
                                flex: 1,
                                padding: '11px 16px',
                                background: 'linear-gradient(135deg, #ea580c, #dc2626)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(234, 88, 12, 0.3)';
                            }}
                        >
                            Got it!
                        </button>
                        <button
                            onClick={handleDismiss}
                            style={{
                                padding: '11px 20px',
                                background: '#334155',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: '#cbd5e1',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#475569';
                                e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#334155';
                                e.currentTarget.style.color = '#cbd5e1';
                            }}
                        >
                            Dismiss
                        </button>
                    </div>

                    {/* Progress Bar - 30 seconds */}
                    <div
                        style={{
                            height: '4px',
                            background: '#1e293b',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #f59e0b, #ea580c, #dc2626)',
                                width: '100%',
                                animation: 'progressShrink 30s linear forwards'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-12deg); }
                    75% { transform: rotate(12deg); }
                }
                
                @keyframes progressShrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}
