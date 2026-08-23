import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, Copy, Check, RefreshCw, Wifi, Globe, ExternalLink, ShieldCheck, Download, Zap, Radio, Clock, Lock, CheckCircle2, Trash2, SmartphoneNfc } from 'lucide-react'
import { Win98PhoneSyncIcon, PocketWindowsFlagIcon } from './win98/Win98Icons'
import { playWin98Click, playWin98Ding } from '../services/win98Audio'
import { startRemoteTunnel, stopRemoteTunnel, getRemoteTunnelStatus, generatePairingTicket, getPairingTicketStatus, getConnectedDevices, deleteConnectedDevice } from '../services/api'

export default function ConnectPhoneModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false)
  const [connectMode, setConnectMode] = useState('remote') // 'remote' (default) | 'wifi'
  
  // Single-Use Ticket States
  const [pairingUrl, setPairingUrl] = useState('')
  const [ticketString, setTicketString] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(300)
  const [loadingTicket, setLoadingTicket] = useState(false)
  const timerRef = useRef(null)

  // Real-Time Handshake States
  const [isPairedSuccess, setIsPairedSuccess] = useState(false)
  const [pairedDevice, setPairedDevice] = useState(null)
  const [connectedDevicesList, setConnectedDevicesList] = useState([])

  // Remote Tunnel States
  const [isStartingTunnel, setIsStartingTunnel] = useState(false)
  const [tunnelStatus, setTunnelStatus] = useState('inactive') // 'inactive' | 'active' | 'error'
  const [tunnelError, setTunnelError] = useState('')

  // Generate fresh single-use pairing ticket
  const fetchFreshTicket = async (mode = connectMode) => {
    try {
      setLoadingTicket(true)
      setIsPairedSuccess(false)
      const data = await generatePairingTicket(mode)
      if (data && data.qr_url) {
        setPairingUrl(data.qr_url)
        setTicketString(data.ticket)
        setSecondsRemaining(data.expires_in_seconds || 300)
      }
    } catch (err) {
      console.error('Failed to generate pairing ticket:', err)
    } finally {
      setLoadingTicket(false)
    }
  }

  // Load connected devices
  const loadConnectedDevices = async () => {
    try {
      const data = await getConnectedDevices()
      if (data && data.devices) {
        setConnectedDevicesList(data.devices)
      }
    } catch (e) {}
  }

  // Effect to load ticket and tunnel status on modal open
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current)
      setIsPairedSuccess(false)
      setPairedDevice(null)
      return
    }

    loadConnectedDevices()

    const initModal = async () => {
      if (connectMode === 'remote') {
        try {
          setIsStartingTunnel(true)
          const res = await startRemoteTunnel(8000)
          if (res && res.url) {
            setTunnelStatus('active')
          }
        } catch (e) {
          console.warn('Tunnel init notice:', e)
        } finally {
          setIsStartingTunnel(false)
        }
      }
      await fetchFreshTicket(connectMode)
    }

    initModal()

    // 1-second countdown ticker
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          fetchFreshTicket(connectMode)
          return 300
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  // Live polling for scan detection
  useEffect(() => {
    if (!isOpen || !ticketString || isPairedSuccess) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await getPairingTicketStatus(ticketString)
        if (res && res.redeemed) {
          playWin98Ding()
          setIsPairedSuccess(true)
          setPairedDevice({
            name: res.device_name || 'Mobile Companion',
            time: res.redeemed_at || new Date().toISOString(),
          })
          loadConnectedDevices()
        }
      } catch (err) {}
    }, 1200)

    return () => clearInterval(pollInterval)
  }, [isOpen, ticketString, isPairedSuccess])

  const handleModeChange = async (mode) => {
    playWin98Click()
    setConnectMode(mode)
    if (mode === 'remote' && tunnelStatus !== 'active') {
      try {
        setIsStartingTunnel(true)
        setTunnelError('')
        const res = await startRemoteTunnel(8000)
        if (res && res.url) {
          setTunnelStatus('active')
        }
      } catch (e) {
        console.warn('Tunnel start notice:', e)
      } finally {
        setIsStartingTunnel(false)
      }
    }
    await fetchFreshTicket(mode)
  }

  const handleStopTunnel = async () => {
    try {
      playWin98Click()
      await stopRemoteTunnel()
      setTunnelStatus('inactive')
      setConnectMode('wifi')
      fetchFreshTicket('wifi')
    } catch (err) {
      console.error('Failed to stop tunnel:', err)
    }
  }

  const handleRevokeDevice = async (deviceId) => {
    try {
      playWin98Click()
      await deleteConnectedDevice(deviceId)
      loadConnectedDevices()
    } catch (err) {
      console.error('Failed to revoke device:', err)
    }
  }

  const copyUrl = () => {
    if (!pairingUrl) return
    navigator.clipboard.writeText(pairingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (!isOpen) return null

  return (
    <div className="win98-dialog-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div 
        className="win98-dialog-window" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: '520px', maxWidth: '95vw' }}
      >
        {/* Title Bar */}
        <div className="win98-dialog-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Win98PhoneSyncIcon size={14} />
            <span>Connect to Phone (Zero-Trust ActiveSync Pairing)</span>
          </div>
          <button 
            onClick={() => { playWin98Click(); onClose(); }}
            className="win98-dialog-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Dialog Content */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Header Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: isPairedSuccess ? '#008000' : '#000080',
            color: '#ffffff',
            padding: '8px 12px',
            boxShadow: 'inset 1px 1px #000, inset -1px -1px #fff',
            transition: 'background-color 0.3s ease'
          }}>
            <PocketWindowsFlagIcon size={24} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                {isPairedSuccess ? 'ActiveSync Pairing Succeeded!' : 'Pocket MemWault Companion Setup'}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.9 }}>
                {isPairedSuccess ? 'Device Handshake Complete • Standalone PWA Linked' : 'Scan Once • 100% Offline Standalone PWA • Single-Use Security'}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isPairedSuccess ? (
              /* Success / Connected View */
              <motion.div
                key="success-view"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  border: '1px solid #000',
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#e6ffe6',
                    border: '2px solid #008000',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CheckCircle2 size={38} color="#008000" />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#008000', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>✓ Smartphone Connected Successfully!</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#000000' }}>
                      <b>Paired Device:</b> <span style={{ color: '#000080', fontWeight: 'bold' }}>{pairedDevice?.name || 'Smartphone'}</span>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#555' }}>
                      Single-use QR pairing ticket was <b>burned immediately</b>. Your phone now has a scoped vault token and can sync offline memories anytime.
                    </div>
                  </div>
                </div>

                {/* Connected Devices List */}
                {connectedDevicesList.length > 0 && (
                  <fieldset className="win98-fieldset" style={{ marginTop: '2px' }}>
                    <legend>Connected Companion Devices ({connectedDevicesList.length})</legend>
                    <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', padding: '2px' }}>
                      {connectedDevicesList.map((dev) => (
                        <div 
                          key={dev.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: dev.device_name === pairedDevice?.name ? '#e8f4fc' : '#f5f5f5',
                            padding: '4px 8px',
                            border: '1px solid #c0c0c0',
                            fontSize: '10.5px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Smartphone size={13} color="#000080" />
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#000' }}>{dev.device_name}</span>
                              {dev.device_name === pairedDevice?.name && (
                                <span style={{ marginLeft: '6px', fontSize: '9px', backgroundColor: '#008000', color: '#fff', padding: '1px 4px', borderRadius: '2px' }}>
                                  Just Paired
                                </span>
                              )}
                              <div style={{ fontSize: '9px', color: '#666' }}>
                                Linked: {new Date(dev.paired_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeDevice(dev.id)}
                            className="win98-standard-btn"
                            style={{ padding: '2px 6px', fontSize: '9.5px', color: '#A20025' }}
                            title="Revoke and unlink this device"
                          >
                            Unlink
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}

                {/* Success Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    onClick={() => { playWin98Click(); fetchFreshTicket(connectMode); }}
                    className="win98-standard-btn"
                    style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>➕ Pair Another Device</span>
                  </button>

                  <button
                    onClick={() => { playWin98Click(); onClose(); }}
                    className="win98-standard-btn"
                    style={{ padding: '5px 22px', fontWeight: 'bold', fontSize: '11px' }}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            ) : (
              /* QR Code Pairing View */
              <motion.div
                key="qr-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {/* Network Mode Selector Tabs */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleModeChange('remote')}
                    className="win98-standard-btn"
                    style={{
                      flex: 1.2,
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: connectMode === 'remote' ? 'bold' : 'normal',
                      backgroundColor: connectMode === 'remote' ? '#ffffff' : '#c0c0c0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: connectMode === 'remote' ? 'inset 1px 1px #000' : undefined,
                    }}
                  >
                    <Globe size={13} color={connectMode === 'remote' ? '#008000' : '#404040'} />
                    <span>Cloudflare Tunnel (Default • 4G/5G)</span>
                  </button>
                  <button
                    onClick={() => handleModeChange('wifi')}
                    className="win98-standard-btn"
                    style={{
                      flex: 0.8,
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: connectMode === 'wifi' ? 'bold' : 'normal',
                      backgroundColor: connectMode === 'wifi' ? '#ffffff' : '#c0c0c0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: connectMode === 'wifi' ? 'inset 1px 1px #000' : undefined,
                    }}
                  >
                    <Wifi size={13} color={connectMode === 'wifi' ? '#000080' : '#404040'} />
                    <span>Local Wi-Fi (LAN)</span>
                  </button>
                </div>

                {/* QR Code & Direct URL Container */}
                <div style={{
                  display: 'flex',
                  gap: '14px',
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  border: '1px solid #000',
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                  alignItems: 'center',
                }}>
                  {/* QR Code */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '6px',
                    border: '1px solid #808080',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    minWidth: '136px',
                    minHeight: '136px',
                    position: 'relative',
                  }}>
                    {isStartingTunnel ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#000080' }}>
                        <RefreshCw size={22} className="spin-anim" />
                        <span>Starting Tunnel...</span>
                      </div>
                    ) : loadingTicket ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#000080' }}>
                        <RefreshCw size={22} className="spin-anim" />
                        <span>Generating QR...</span>
                      </div>
                    ) : pairingUrl ? (
                      <QRCodeSVG value={pairingUrl} size={130} level="M" />
                    ) : (
                      <div style={{ width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={24} className="spin-anim" />
                      </div>
                    )}
                  </div>

                  {/* URL Details & Security Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} color="#008000" />
                        <span>Single-Use Pairing Ticket</span>
                      </div>
                      <div style={{ fontSize: '10px', color: secondsRemaining < 60 ? '#A20025' : '#000080', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Clock size={10} />
                        <span>Expires in {formatTimer(secondsRemaining)}</span>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '9.5px', color: '#555', lineHeight: 1.35 }}>
                      {connectMode === 'remote'
                        ? 'Encrypted Cloudflare tunnel connects phone on mobile data. Ticket is burned immediately upon scan.'
                        : 'Scan on same Wi-Fi router. Ticket burns upon first scan and pairs phone permanently.'}
                    </div>

                    <div style={{
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      backgroundColor: '#f0f0f0',
                      padding: '4px 6px',
                      border: '1px solid #808080',
                      wordBreak: 'break-all',
                      maxHeight: '40px',
                      overflowY: 'auto'
                    }}>
                      {pairingUrl || 'Generating secure ticket...'}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      {pairingUrl && (
                        <button
                          onClick={copyUrl}
                          className="win98-standard-btn"
                          style={{
                            padding: '3px 8px',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {copied ? <Check size={11} color="#008000" /> : <Copy size={11} />}
                          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => { playWin98Click(); fetchFreshTicket(connectMode); }}
                        className="win98-standard-btn"
                        style={{
                          padding: '3px 8px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RefreshCw size={10} />
                        <span>Refresh QR</span>
                      </button>

                      {connectMode === 'remote' && tunnelStatus === 'active' && (
                        <button
                          onClick={handleStopTunnel}
                          className="win98-standard-btn"
                          style={{
                            padding: '3px 8px',
                            fontSize: '10px',
                            color: '#A20025',
                          }}
                        >
                          Stop Tunnel
                        </button>
                      )}
                    </div>

                    {tunnelError && (
                      <div style={{ fontSize: '9px', color: '#A20025', marginTop: '2px' }}>
                        Error: {tunnelError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Security & One-Time Scan Guarantee */}
                <fieldset className="win98-fieldset">
                  <legend>Zero-Trust Security & Standalone Guarantee</legend>
                  <div style={{ fontSize: '10.5px', lineHeight: 1.45, color: '#000000', padding: '3px 2px' }}>
                    <div>🛡️ <b>Scan Once, Paired Forever:</b> Your phone stores its own permanent device key. You will <b>never</b> need to scan this QR code again.</div>
                    <div style={{ marginTop: '3px' }}>🔥 <b>Live Detection:</b> This screen automatically updates the moment your phone finishes scanning.</div>
                  </div>
                </fieldset>

                {/* Bottom Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                  <button
                    onClick={() => { playWin98Click(); onClose(); }}
                    className="win98-standard-btn"
                    style={{ padding: '4px 18px', fontWeight: 'bold' }}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
