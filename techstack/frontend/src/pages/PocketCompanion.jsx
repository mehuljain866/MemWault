import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Image as ImageIcon, Film, BookOpen, Compass, 
  Calendar, Search, MapPin, Music, ChevronRight, Upload, 
  CheckCircle2, Wifi, Battery, BatteryCharging, Play, Pause, Volume2, VolumeX, ShieldCheck,
  ChevronLeft, Plus, ExternalLink, Menu, X, ArrowLeft, RefreshCw,
  Sliders, Folder, Share2, Trash2, Camera, Download, Heart, Eye,
  Check, HardDrive, Smartphone, Settings as SettingsIcon, Radio,
  Info, Layers, Globe, Server, AlertCircle, Moon, Sun, Bell, Grid, Filter
} from 'lucide-react';
import { 
  getOfflineMemories, getOfflinePosts, getStorageStats, 
  syncPocketWithLaptop, getPocketSyncMeta, getOnThisDayMemory 
} from '../services/pocketSync';
import { 
  addPendingMobileUpload, getPendingMobileUploads, 
  removePendingUpload, openMobileDB 
} from '../services/memwaultMobileDB';
import { playWin98Click, playWin98Startup } from '../services/win98Audio';

// ── Authentic Windows Phone 8.1 Lumia Accent Palette ────────────────────────
const LUMIA_ACCENTS = [
  { name: 'Cobalt', hex: '#0050EF' },
  { name: 'Cyan', hex: '#1BA1E2' },
  { name: 'Nokia Blue', hex: '#008299' },
  { name: 'Emerald', hex: '#008A00' },
  { name: 'Lime', hex: '#A4C400' },
  { name: 'Green', hex: '#60A917' },
  { name: 'Mango', hex: '#F09609' },
  { name: 'Orange', hex: '#FA6800' },
  { name: 'Amber', hex: '#F0A30A' },
  { name: 'Yellow', hex: '#E3C800' },
  { name: 'Crimson', hex: '#A20025' },
  { name: 'Red', hex: '#E51400' },
  { name: 'Magenta', hex: '#D80073' },
  { name: 'Pink', hex: '#E671B8' },
  { name: 'Violet', hex: '#AA00FF' },
  { name: 'Purple', hex: '#76608A' },
  { name: 'Indigo', hex: '#6B007B' },
  { name: 'Steel', hex: '#647687' },
  { name: 'Taupe', hex: '#87794E' },
  { name: 'Brown', hex: '#825A2C' },
];

export default function PocketCompanion() {
  // ── Theme & Customization States ──────────────────────────────────────────
  const [accent, setAccent] = useState(() => localStorage.getItem('metro_accent') || '#0050EF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('metro_theme') || 'dark'); // 'dark' | 'light'
  const [enableLiveFlip, setEnableLiveFlip] = useState(() => localStorage.getItem('metro_live_flip') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('metro_sound') !== 'false');
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(() => localStorage.getItem('metro_auto_sync') === 'true');
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('metro_server_host') || '192.168.29.50');

  // ── Navigation & Content States ───────────────────────────────────────────
  const [activePivot, setActivePivot] = useState('start'); // 'start' | 'memories' | 'feed' | 'journal' | 'settings'
  const [settingsTab, setSettingsTab] = useState('personalization'); // 'personalization' | 'sync' | 'storage' | 'about'
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, storageMb: '0.00' });
  const [selectedStory, setSelectedStory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled' | 'music'
  const [isAppBarExpanded, setIsAppBarExpanded] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Real-Time Status Bar States ───────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(85);

  // ── Live Tile 3D Flip Timers ──────────────────────────────────────────────
  const [flipToday, setFlipToday] = useState(false);
  const [flipMemories, setFlipMemories] = useState(false);
  const [flipFeed, setFlipFeed] = useState(false);
  const [flipSettings, setFlipSettings] = useState(false);

  // ── Sync Progress States ──────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('metro_last_sync') || null);

  // File Upload Ref
  const fileInputRef = useRef(null);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const surfaceColor = isDark ? '#1F1F1F' : '#F2F2F2';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#333333' : '#E0E0E0';

  const triggerSound = () => {
    if (soundEnabled) {
      playWin98Click();
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Initial Offline Data Load ─────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      const cachedStories = await getOfflineMemories();
      const cachedPosts = await getOfflinePosts();
      const st = await getStorageStats();
      const pending = await getPendingMobileUploads();
      setStories(cachedStories);
      setPosts(cachedPosts);
      setStats(st);
      setPendingUploads(pending);

      if (cachedStories.length === 0 && autoSyncOnOpen) {
        handleRunSync();
      }
    }
    loadData();
  }, []);

  // ── Clock & Battery ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 15000);

    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        setBatteryLevel(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
      }).catch(() => {});
    }

    return () => clearInterval(timer);
  }, []);

  // ── Staggered Live Tile 3D Flips ──────────────────────────────────────────
  useEffect(() => {
    if (!enableLiveFlip) return;
    const t1 = setInterval(() => setFlipToday(f => !f), 6000);
    const t2 = setInterval(() => setFlipMemories(f => !f), 7500);
    const t3 = setInterval(() => setFlipFeed(f => !f), 9000);
    const t4 = setInterval(() => setFlipSettings(f => !f), 11000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
      clearInterval(t4);
    };
  }, [enableLiveFlip]);

  // ── Accent & Theme Modifiers ──────────────────────────────────────────────
  const changeAccent = (hex) => {
    setAccent(hex);
    localStorage.setItem('metro_accent', hex);
    triggerSound();
  };

  const toggleThemeMode = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    localStorage.setItem('metro_theme', newMode);
    triggerSound();
  };

  const toggleLiveFlip = () => {
    const newVal = !enableLiveFlip;
    setEnableLiveFlip(newVal);
    localStorage.setItem('metro_live_flip', String(newVal));
    triggerSound();
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('metro_sound', String(newVal));
  };

  // ── Full Live ActiveSync Operation ────────────────────────────────────────
  const handleRunSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    triggerSound();
    const timeStr = new Date().toLocaleTimeString();
    setSyncLogs(prev => [