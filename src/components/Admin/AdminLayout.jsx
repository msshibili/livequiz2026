import React, { useState } from 'react';
import { 
  Radio, 
  HelpCircle, 
  Users, 
  Sliders, 
  FileText, 
  LogOut, 
  Activity, 
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function AdminLayout({ activeTab, setActiveTab, adminUser, onLogout, children }) {
  const { eventStatus, isConnected } = useQuizSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'control-room', label: 'Live Control Room', icon: Radio },
    { id: 'questions', label: 'Question Editor', icon: HelpCircle },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'scoring-config', label: 'Scoring Engine', icon: Sliders },
    { id: 'audit-logs', label: 'Audit Log', icon: FileText }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      
      {/* Mobile Control Room Header */}
      <header style={{
        height: '60px',
        background: 'rgba(11, 17, 30, 0.95)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '800',
              fontSize: '0.85rem'
            }}>
              X7
            </div>
            <span style={{ fontSize: '1rem', fontWeight: '800' }}>Control Room</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`badge ${eventStatus === 'QUESTION_ACTIVE' ? 'badge-live' : 'badge-ready'}`} style={{ fontSize: '0.72rem' }}>
            {eventStatus}
          </span>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minWidth: 0, position: 'relative' }}>
        
        {/* Sidebar Drawer (Desktop permanent, Mobile collapsible overlay) */}
        <aside style={{
          width: '260px',
          background: 'rgba(11, 17, 30, 0.98)',
          borderRight: '1px solid var(--border-subtle)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'fixed',
          top: '60px',
          bottom: 0,
          left: mobileMenuOpen ? 0 : '-280px',
          zIndex: 90,
          transition: 'left 0.3s ease'
        }}>
          <div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      fontWeight: isActive ? '700' : '500',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent'
                    }}
                  >
                    <Icon size={18} color={isActive ? '#818cf8' : 'currentColor'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px mb-8px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>{adminUser?.username || 'Admin'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Super Admin</div>
              </div>
              <ShieldCheck size={18} color="var(--accent-success)" />
            </div>

            <button
              onClick={onLogout}
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '12px', fontSize: '0.82rem', padding: '8px' }}
            >
              <LogOut size={16} /> Exit Control Room
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '60px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 80
            }}
          />
        )}

        {/* Main Content */}
        <main style={{ padding: '20px 16px', flex: 1, minWidth: 0, width: '100%' }}>
          {children}
        </main>
      </div>

    </div>
  );
}
