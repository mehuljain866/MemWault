import React from 'react';

// Common wrapper for pixel-perfect Win98 SVG Icons
const createIcon = (svgContent, defaultViewBox = "0 0 32 32") => {
  return function Win98Icon({ size = 32, className = '', style = {}, ...props }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={defaultViewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          imageRendering: 'pixelated',
          flexShrink: 0,
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style
        }}
        {...props}
      >
        {svgContent}
      </svg>
    );
  };
};

/**
 * 1. Vault Main / MemWault.exe (My Computer - CRT Monitor + Desktop Unit)
 */
export const Win98VaultMainIcon = createIcon(
  <>
    {/* CRT Monitor Housing (Beige) */}
    <rect x="4" y="2" width="24" height="18" fill="#DFDFDF" stroke="#000000" strokeWidth="1" />
    <path d="M4 2H28V3H5V20H4V2Z" fill="#FFFFFF" />
    <path d="M27 3V19H5V20H28V2H27V3Z" fill="#808080" />
    
    {/* Screen Bezel (Dark Gray) */}
    <rect x="6" y="4" width="20" height="14" fill="#808080" stroke="#000000" strokeWidth="1" />
    <path d="M6 4H26V5H7V17H6V4Z" fill="#000000" />
    <path d="M25 5V17H7V18H26V4H25V5Z" fill="#C0C0C0" />
    
    {/* CRT Screen Display (Classic Win98 Desktop Teal + Navy Window) */}
    <rect x="7" y="5" width="18" height="12" fill="#008080" />
    {/* Mini Window on Screen */}
    <rect x="9" y="7" width="11" height="8" fill="#C0C0C0" stroke="#000000" strokeWidth="0.75" />
    <rect x="10" y="8" width="9" height="2" fill="#000080" />
    <rect x="10" y="10" width="9" height="4" fill="#FFFFFF" />
    {/* Power LED */}
    <rect x="23" y="18" width="2" height="1.5" fill="#00FF00" />

    {/* Monitor Stand */}
    <rect x="13" y="20" width="6" height="3" fill="#C0C0C0" stroke="#000000" strokeWidth="0.75" />
    <path d="M11 23H21V24H11Z" fill="#DFDFDF" stroke="#000000" strokeWidth="0.75" />

    {/* Desktop Computer Unit (Beige Base) */}
    <rect x="2" y="24" width="28" height="7" fill="#DCD8CF" stroke="#000000" strokeWidth="1" />
    <path d="M2 24H30V25H3V30H2V24Z" fill="#FFFFFF" />
    <path d="M29 25V30H3V31H30V24H29V25Z" fill="#808080" />
    
    {/* 3.5" Floppy Slot */}
    <rect x="18" y="26" width="9" height="2" fill="#000000" />
    <rect x="19" y="26.5" width="7" height="1" fill="#808080" />
    <rect x="25.5" y="28.5" width="1.5" height="1" fill="#808080" />
    
    {/* Power Button & Activity LEDs */}
    <rect x="5" y="26" width="2.5" height="2.5" fill="#808080" stroke="#000000" strokeWidth="0.5" />
    <rect x="9.5" y="26.5" width="1.5" height="1.5" fill="#00FF00" />
    <rect x="12" y="26.5" width="1.5" height="1.5" fill="#FF8000" />
  </>
);

/**
 * 2. Feed Posts / FeedViewer.exe (Kodak 35mm Camera & Snapshot)
 */
export const Win98FeedViewerIcon = createIcon(
  <>
    {/* Camera Top Flash / Viewfinder */}
    <path d="M10 6H22V10H10Z" fill="#A0A0A0" stroke="#000000" strokeWidth="1" />
    <rect x="11" y="7" width="4" height="2" fill="#FFFFFF" />
    <rect x="20" y="7" width="4" height="2" fill="#FFFF00" stroke="#000000" strokeWidth="0.5" />
    <rect x="6" y="8" width="3" height="2" fill="#FF0000" stroke="#000000" strokeWidth="0.5" />

    {/* Camera Body (Silver & Black Leatherette Grip) */}
    <rect x="3" y="10" width="26" height="17" rx="1" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M4 11H28V12H5V26H4V11Z" fill="#FFFFFF" />
    <rect x="3" y="13" width="26" height="11" fill="#202020" />
    <path d="M4 14H28V15H5V23H4V14Z" fill="#404040" />

    {/* Big Camera Lens (Multi-layered 3D Rings) */}
    <circle cx="16" cy="18.5" r="7" fill="#808080" stroke="#000000" strokeWidth="1" />
    <circle cx="16" cy="18.5" r="5.5" fill="#000000" />
    <circle cx="16" cy="18.5" r="4" fill="#008080" />
    <circle cx="16" cy="18.5" r="2.5" fill="#000080" />
    {/* Specular Glare Reflection */}
    <path d="M13 15.5C14 14.5 16 14.5 17.5 15" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="18" cy="20" r="0.75" fill="#FFFFFF" />

    {/* Ejected Instant Film Photo in Bottom Corner */}
    <rect x="18" y="19" width="12" height="11" fill="#FFFFFF" stroke="#000000" strokeWidth="0.75" />
    <rect x="19.5" y="20.5" width="9" height="7" fill="#0080FF" />
    {/* Green Hill in Photo */}
    <polygon points="19.5,27.5 24,23 28.5,27.5" fill="#008000" />
    <circle cx="26" cy="22" r="1" fill="#FFFF00" />
  </>
);

/**
 * 3. Memories / StoryViewer.exe (Classic Picture Frame & Rainbow Landscape)
 */
export const Win98MemoriesIcon = createIcon(
  <>
    {/* Outer Gilt Wooden Picture Frame */}
    <rect x="3" y="3" width="26" height="26" fill="#C49A45" stroke="#000000" strokeWidth="1" />
    <path d="M3 3H29V5H5V27H3V3Z" fill="#FFEAA5" />
    <path d="M27 5V27H5V29H29V3H27V5Z" fill="#5C4308" />

    {/* Inner Matte Border (White Linen) */}
    <rect x="6" y="6" width="20" height="20" fill="#FFFFFF" stroke="#808080" strokeWidth="1" />

    {/* Artwork Canvas */}
    <rect x="8" y="8" width="16" height="16" fill="#00A0E8" />
    
    {/* Sunset Sun */}
    <circle cx="18" cy="12" r="3.5" fill="#FFFF00" stroke="#FF8000" strokeWidth="0.5" />
    
    {/* Rolling Green Hills */}
    <polygon points="8,24 15,16 21,24" fill="#008000" />
    <polygon points="13,24 19,17 24,24" fill="#00A800" />
    <polygon points="17,24 22,19 24,24" fill="#80D800" />
    
    {/* Foreground Flowers */}
    <rect x="10" y="22" width="1.5" height="1.5" fill="#FF0040" />
    <rect x="12" y="21" width="1.5" height="1.5" fill="#FFFF00" />
    <rect x="15" y="22.5" width="1.5" height="1.5" fill="#FF0080" />
  </>
);

/**
 * 4. Journal / Journal.exe (Windows 98 Spiral Notepad & Pencil)
 */
export const Win98JournalIcon = createIcon(
  <>
    {/* Notepad Shadow */}
    <rect x="6" y="5" width="22" height="25" fill="#000000" opacity="0.3" />

    {/* Blue Notepad Cover & Paper */}
    <rect x="4" y="3" width="22" height="25" fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
    <rect x="4" y="3" width="4" height="25" fill="#000080" />
    <path d="M4 3H26V4H5V27H4V3Z" fill="#FFFFFF" />

    {/* Lined Ruled Pages */}
    <line x1="10" y1="8" x2="23" y2="8" stroke="#80C0FF" strokeWidth="1" />
    <line x1="10" y1="12" x2="23" y2="12" stroke="#80C0FF" strokeWidth="1" />
    <line x1="10" y1="16" x2="23" y2="16" stroke="#80C0FF" strokeWidth="1" />
    <line x1="10" y1="20" x2="23" y2="20" stroke="#80C0FF" strokeWidth="1" />
    <line x1="10" y1="24" x2="20" y2="24" stroke="#80C0FF" strokeWidth="1" />

    {/* Spiral Wire Loops */}
    {[5, 9, 13, 17, 21, 25].map((y) => (
      <g key={y}>
        <rect x="2" y={y} width="5" height="2" rx="1" fill="#C0C0C0" stroke="#000000" strokeWidth="0.75" />
        <rect x="3" y={y + 0.5} width="3" height="0.8" fill="#FFFFFF" />
      </g>
    ))}

    {/* Yellow No. 2 Pencil at Angle */}
    <g transform="rotate(-35 22 18)">
      {/* Pencil Body */}
      <rect x="18" y="6" width="4.5" height="18" fill="#FFC800" stroke="#000000" strokeWidth="0.75" />
      <line x1="19.5" y1="6" x2="19.5" y2="24" stroke="#FFE880" strokeWidth="0.75" />
      <line x1="21" y1="6" x2="21" y2="24" stroke="#D49A00" strokeWidth="0.75" />
      
      {/* Silver Ferrule */}
      <rect x="18" y="3.5" width="4.5" height="2.5" fill="#C0C0C0" stroke="#000000" strokeWidth="0.75" />
      <line x1="18" y1="4.5" x2="22.5" y2="4.5" stroke="#000000" strokeWidth="0.5" />
      
      {/* Pink Eraser */}
      <rect x="18" y="1" width="4.5" height="2.5" rx="1" fill="#FF7080" stroke="#000000" strokeWidth="0.75" />
      
      {/* Sharpened Wood Collar & Graphite Tip */}
      <polygon points="18,24 22.5,24 20.25,29" fill="#FFE4B5" stroke="#000000" strokeWidth="0.75" />
      <polygon points="19.25,27 21.25,27 20.25,29" fill="#000000" />
    </g>
  </>
);

/**
 * 5. Reel Player / StoryReels.exe (Windows Media Player & Film Clapper)
 */
export const Win98StoryReelsIcon = createIcon(
  <>
    {/* Clapperboard Slate */}
    <rect x="4" y="6" width="24" height="21" rx="1" fill="#202020" stroke="#000000" strokeWidth="1" />
    
    {/* Top Diagonal Striped Clapper Arm */}
    <rect x="4" y="6" width="24" height="7" fill="#000000" stroke="#000000" strokeWidth="1" />
    <polygon points="4,6 9,6 4,13" fill="#FFFFFF" />
    <polygon points="10,6 15,6 8,13 3,13" fill="#FFFFFF" />
    <polygon points="16,6 21,6 14,13 9,13" fill="#FFFFFF" />
    <polygon points="22,6 27,6 20,13 15,13" fill="#FFFFFF" />
    <polygon points="28,6 28,9 24,13 21,13" fill="#FFFFFF" />

    {/* Film Strip Holes */}
    <rect x="4" y="14" width="24" height="13" fill="#303030" />
    {[6, 11, 16, 21].map((x) => (
      <rect key={x} x={x} y="15" width="2.5" height="2" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
    ))}
    {[6, 11, 16, 21].map((x) => (
      <rect key={x} x={x} y="23.5" width="2.5" height="2" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
    ))}

    {/* Classic Media Player Circular Green Play Button */}
    <circle cx="16" cy="20" r="5" fill="#000080" stroke="#FFFFFF" strokeWidth="1" />
    <polygon points="14.5,17.5 14.5,22.5 19,20" fill="#00FF00" stroke="#000000" strokeWidth="0.5" />
  </>
);

/**
 * 6. Highlights / Collections.exe (CD-ROM Disc & Jewel Case)
 */
export const Win98CollectionsIcon = createIcon(
  <>
    {/* Jewel Case Backing */}
    <rect x="3" y="3" width="26" height="26" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M3 3H29V4H4V28H3V3Z" fill="#FFFFFF" />
    <rect x="3" y="3" width="4" height="26" fill="#000080" />

    {/* CD Optical Disc */}
    <circle cx="16.5" cy="16" r="10.5" fill="#E8E8E8" stroke="#000000" strokeWidth="1" />
    
    {/* Rainbow Holographic Reflections */}
    <path d="M16.5 6A10 10 0 0 1 25.5 11L21 13.5A5 5 0 0 0 16.5 11Z" fill="#FF8080" opacity="0.8" />
    <path d="M26.5 16A10 10 0 0 1 24 23L20 19.5A5 5 0 0 0 21.5 16Z" fill="#80FF80" opacity="0.8" />
    <path d="M16.5 26A10 10 0 0 1 7.5 21L12 18.5A5 5 0 0 0 16.5 21Z" fill="#8080FF" opacity="0.8" />
    <path d="M6.5 16A10 10 0 0 1 9 9L13 12.5A5 5 0 0 0 11.5 16Z" fill="#FFFF80" opacity="0.8" />

    {/* Clear Center Ring & Spindle Hole */}
    <circle cx="16.5" cy="16" r="4.5" fill="#C0C0C0" stroke="#808080" strokeWidth="0.75" />
    <circle cx="16.5" cy="16" r="2" fill="#FFFFFF" stroke="#000000" strokeWidth="1" />

    {/* Starburst Specular Highlight */}
    <polygon points="12,10 13,12 15,12 13.5,13.5 14,15.5 12,14 10,15.5 10.5,13.5 9,12 11,12" fill="#FFFFFF" />
  </>
);

/**
 * 7. Geo Map / WorldAtlas.exe (Network Neighborhood / Earth Globe)
 */
export const Win98WorldAtlasIcon = createIcon(
  <>
    {/* Globe Stand (Brass Base & Arm) */}
    <path d="M16 25V28M10 28H22V30H10Z" fill="#C49A45" stroke="#000000" strokeWidth="1" />
    <path d="M11 28H21V29H12V30H10V28H11Z" fill="#FFEAA5" />
    <path d="M6 14C6 20 11 24.5 17 24.5" stroke="#C49A45" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 14C6 20 11 24.5 17 24.5" stroke="#000000" strokeWidth="1" strokeLinecap="round" />
    <circle cx="16" cy="4" r="1.5" fill="#C49A45" stroke="#000000" strokeWidth="0.75" />

    {/* Blue Ocean Globe Sphere */}
    <circle cx="16" cy="14" r="9.5" fill="#0050D0" stroke="#000000" strokeWidth="1" />
    
    {/* Continents (Green) */}
    <path d="M10 10C11 8 13 8 14 10C15 12 13 15 11 15C10 15 9 12 10 10Z" fill="#00C000" />
    <path d="M12 16C13 15 15 16 16 18C16 21 14 22 13 22C12 21 11 18 12 16Z" fill="#00C000" />
    <path d="M17 8C19 7 23 8 24 10C24 13 21 14 18 13C16 12 16 9 17 8Z" fill="#00C000" />
    <path d="M18 15C20 14 23 16 23 18C22 20 19 21 18 19C17 18 17 16 18 15Z" fill="#00C000" />

    {/* Latitude / Longitude Grid Lines */}
    <ellipse cx="16" cy="14" rx="9.5" ry="3.5" stroke="#003090" strokeWidth="0.75" fill="none" />
    <ellipse cx="16" cy="14" rx="4.5" ry="9.5" stroke="#003090" strokeWidth="0.75" fill="none" />

    {/* Red Location Map Pin Marker */}
    <circle cx="19" cy="9" r="2.5" fill="#FF0000" stroke="#000000" strokeWidth="0.75" />
    <circle cx="19" cy="9" r="0.75" fill="#FFFFFF" />
    <polygon points="17.5,10.5 20.5,10.5 19,13.5" fill="#FF0000" stroke="#000000" strokeWidth="0.5" />
  </>
);

/**
 * 8. Archives / Cabinet.exe (2-Drawer Steel Office Filing Cabinet)
 */
export const Win98CabinetIcon = createIcon(
  <>
    {/* Cabinet Steel Outer Shell */}
    <rect x="5" y="3" width="22" height="26" fill="#808080" stroke="#000000" strokeWidth="1" />
    <path d="M5 3H27V4H6V28H5V3Z" fill="#C0C0C0" />
    <path d="M26 4V28H6V29H27V3H26V4Z" fill="#404040" />

    {/* Top Drawer */}
    <rect x="7" y="5" width="18" height="10" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M7 5H25V6H8V14H7V5Z" fill="#FFFFFF" />
    <path d="M24 6V14H8V15H25V5H24V6Z" fill="#808080" />
    {/* Top Drawer Handle & Label Card */}
    <rect x="13" y="10" width="6" height="2" fill="#FFFFFF" stroke="#000000" strokeWidth="0.75" />
    <rect x="11" y="7" width="10" height="2" fill="#FFFFDF" stroke="#000000" strokeWidth="0.5" />

    {/* Bottom Drawer */}
    <rect x="7" y="17" width="18" height="10" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M7 17H25V18H8V26H7V17Z" fill="#FFFFFF" />
    <path d="M24 18V26H8V27H25V17H24V18Z" fill="#808080" />
    {/* Bottom Drawer Handle & Label Card */}
    <rect x="13" y="22" width="6" height="2" fill="#FFFFFF" stroke="#000000" strokeWidth="0.75" />
    <rect x="11" y="19" width="10" height="2" fill="#FFFFDF" stroke="#000000" strokeWidth="0.5" />

    {/* Colored File Folders Peeking Out of Top Drawer */}
    <polygon points="8,5 12,2 17,2 17,5" fill="#FF8080" stroke="#000000" strokeWidth="0.5" />
    <polygon points="14,5 18,1 23,1 23,5" fill="#FFFF80" stroke="#000000" strokeWidth="0.5" />
    <polygon points="19,5 22,2.5 25,2.5 25,5" fill="#80FF80" stroke="#000000" strokeWidth="0.5" />
  </>
);

/**
 * 9. Setup / Control Panel / Setup.exe (Control Panel Console & Sliders)
 */
export const Win98SetupIcon = createIcon(
  <>
    {/* Outer Beveled Case */}
    <rect x="3" y="4" width="26" height="24" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M3 4H29V5H4V27H3V4Z" fill="#FFFFFF" />
    <path d="M28 5V27H4V28H29V4H28V5Z" fill="#808080" />

    {/* Control Panel Vertical Fader Slots */}
    <rect x="7" y="8" width="2" height="14" fill="#000000" />
    <rect x="15" y="8" width="2" height="14" fill="#000000" />
    <rect x="23" y="8" width="2" height="14" fill="#000000" />

    {/* Fader Knobs at Different Heights */}
    {/* Fader 1 (Blue Knob at High) */}
    <rect x="5.5" y="10" width="5" height="4" fill="#000080" stroke="#000000" strokeWidth="0.75" />
    <line x1="6.5" y1="12" x2="9.5" y2="12" stroke="#FFFFFF" strokeWidth="0.75" />

    {/* Fader 2 (Red Knob at Low) */}
    <rect x="13.5" y="16" width="5" height="4" fill="#CC0000" stroke="#000000" strokeWidth="0.75" />
    <line x1="14.5" y1="18" x2="17.5" y2="18" stroke="#FFFFFF" strokeWidth="0.75" />

    {/* Fader 3 (Yellow/Green Knob at Middle) */}
    <rect x="21.5" y="13" width="5" height="4" fill="#008000" stroke="#000000" strokeWidth="0.75" />
    <line x1="22.5" y1="15" x2="25.5" y2="15" stroke="#FFFFFF" strokeWidth="0.75" />

    {/* Crossed Brass Tools in Foreground */}
    {/* Screwdriver */}
    <line x1="6" y1="26" x2="26" y2="6" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="6" y1="26" x2="26" y2="6" stroke="#DFDFDF" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6" y1="26" x2="12" y2="20" stroke="#FF8000" strokeWidth="3" strokeLinecap="round" />
  </>
);

/**
 * 10. Display Properties (Monitor + Artist Palette & Brush)
 */
export const Win98DisplayPropertiesIcon = createIcon(
  <>
    {/* Monitor */}
    <rect x="3" y="3" width="22" height="17" fill="#DFDFDF" stroke="#000000" strokeWidth="1" />
    <path d="M3 3H25V4H4V19H3V3Z" fill="#FFFFFF" />
    <path d="M24 4V19H4V20H25V3H24V4Z" fill="#808080" />
    <rect x="5" y="5" width="18" height="13" fill="#000080" />
    {/* Stand */}
    <rect x="11" y="20" width="6" height="3" fill="#C0C0C0" stroke="#000000" strokeWidth="0.75" />
    <rect x="8" y="23" width="12" height="2" fill="#808080" stroke="#000000" strokeWidth="0.75" />

    {/* Artist Palette */}
    <ellipse cx="21" cy="21" rx="8" ry="6" fill="#C49A45" stroke="#000000" strokeWidth="1" />
    <circle cx="25" cy="23" r="1.5" fill="#000000" />
    {/* Paint Blobs */}
    <circle cx="17" cy="18" r="1.5" fill="#FF0000" />
    <circle cx="21" cy="17" r="1.5" fill="#FFFF00" />
    <circle cx="25" cy="19" r="1.5" fill="#00FF00" />
    <circle cx="17" cy="22" r="1.5" fill="#0000FF" />

    {/* Paint Brush */}
    <line x1="14" y1="28" x2="28" y2="14" stroke="#5C4308" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="25" y1="17" x2="28" y2="14" stroke="#404040" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="28" cy="14" r="1" fill="#FF0000" />
  </>
);

/**
 * 11. Recycle Bin (Empty / Full Classic Wastebasket)
 */
export const Win98RecycleBinIcon = createIcon(
  <>
    {/* Blue/Silver Wire Wastepaper Basket */}
    <path d="M7 8L9 28H23L25 8H7Z" fill="#0080FF" fillOpacity="0.85" stroke="#000000" strokeWidth="1" />
    <ellipse cx="16" cy="8" rx="9" ry="2.5" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <ellipse cx="16" cy="8" rx="7.5" ry="1.5" fill="#004080" />

    {/* Wire Mesh Grid Lines */}
    <line x1="11" y1="8" x2="12" y2="28" stroke="#FFFFFF" strokeWidth="0.75" />
    <line x1="16" y1="9.5" x2="16" y2="28" stroke="#FFFFFF" strokeWidth="0.75" />
    <line x1="21" y1="8" x2="20" y2="28" stroke="#FFFFFF" strokeWidth="0.75" />
    
    <line x1="8" y1="13" x2="24" y2="13" stroke="#FFFFFF" strokeWidth="0.75" />
    <line x1="8.5" y1="18" x2="23.5" y2="18" stroke="#FFFFFF" strokeWidth="0.75" />
    <line x1="9" y1="23" x2="23" y2="23" stroke="#FFFFFF" strokeWidth="0.75" />

    {/* Green Mobius Recycling Arrows */}
    <circle cx="16" cy="18" r="4.5" fill="#000000" opacity="0.3" />
    <path d="M14 15L16 13L18 15M18 16L20 18L18 20M15 21L13 19L15 17" stroke="#00FF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Discarded Paper Crumples */}
    <polygon points="12,5 15,3 17,7 13,8" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
    <polygon points="17,6 20,4 21,8 18,8" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
  </>
);

/**
 * 12. Programs Folder (Classic Manila Yellow Folder)
 */
export const Win98FolderIcon = createIcon(
  <>
    {/* Back Tab */}
    <polygon points="3,6 12,6 14,9 27,9 27,25 3,25" fill="#D4A017" stroke="#000000" strokeWidth="1" />
    <path d="M3 6H12L14 9H27V10H14L12 7H4V24H3V6Z" fill="#FFEAA5" />
    
    {/* Paper Documents inside Folder */}
    <rect x="6" y="8" width="18" height="12" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
    <line x1="8" y1="11" x2="18" y2="11" stroke="#000080" strokeWidth="0.75" />
    <line x1="8" y1="14" x2="20" y2="14" stroke="#808080" strokeWidth="0.75" />
    <line x1="8" y1="17" x2="16" y2="17" stroke="#808080" strokeWidth="0.75" />

    {/* Front Folder Flap (Bright Yellow) */}
    <polygon points="3,11 11,11 13,13 29,13 27,27 3,27" fill="#FFE066" stroke="#000000" strokeWidth="1" />
    <path d="M3 11H11L13 13H28L26.5 26H4L3 11Z" fill="#FFF2B2" />
    <path d="M28 14L26.5 26.5H4L3.5 27H27L29 13H28V14Z" fill="#997300" />
  </>
);

/**
 * 13. Search / Find (Document + Magnifying Glass)
 */
export const Win98FindIcon = createIcon(
  <>
    {/* Sheet of Paper with Folded Dog-Ear Corner */}
    <polygon points="4,4 18,4 24,10 24,28 4,28" fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
    <polygon points="18,4 18,10 24,10" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <line x1="7" y1="9" x2="15" y2="9" stroke="#808080" strokeWidth="1" />
    <line x1="7" y1="13" x2="20" y2="13" stroke="#808080" strokeWidth="1" />
    <line x1="7" y1="17" x2="15" y2="17" stroke="#808080" strokeWidth="1" />
    <line x1="7" y1="21" x2="20" y2="21" stroke="#808080" strokeWidth="1" />

    {/* Magnifying Glass */}
    <circle cx="19" cy="18" r="6" fill="#80C0FF" fillOpacity="0.7" stroke="#000000" strokeWidth="1.5" />
    <circle cx="19" cy="18" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
    <line x1="23.5" y1="22.5" x2="29" y2="28" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
    <line x1="23.5" y1="22.5" x2="28" y2="27" stroke="#808080" strokeWidth="1.5" strokeLinecap="round" />
  </>
);

/**
 * 14. Help (Blue Book with Yellow Question Mark)
 */
export const Win98HelpIcon = createIcon(
  <>
    {/* Blue Hardcover Book */}
    <rect x="5" y="4" width="22" height="25" rx="1" fill="#000080" stroke="#000000" strokeWidth="1" />
    <path d="M5 4H27V5H6V28H5V4Z" fill="#5C80E8" />
    
    {/* Book Pages Edging */}
    <rect x="24" y="6" width="3" height="21" fill="#FFFFDF" stroke="#000000" strokeWidth="0.5" />
    
    {/* Golden Question Mark */}
    <text
      x="14"
      y="22"
      fill="#FFFF00"
      stroke="#B8860B"
      strokeWidth="0.5"
      fontFamily="Tahoma, Arial, sans-serif"
      fontSize="17"
      fontWeight="bold"
      textAnchor="middle"
    >
      ?
    </text>
  </>
);

/**
 * 15. Shut Down (Computer with Red Power Key / Screen)
 */
export const Win98ShutDownIcon = createIcon(
  <>
    {/* Computer Case */}
    <rect x="4" y="5" width="24" height="22" rx="1" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M4 5H28V6H5V26H4V5Z" fill="#FFFFFF" />
    <path d="M27 6V26H5V27H28V5H27V6Z" fill="#808080" />

    {/* Red Power Switch Circle */}
    <circle cx="16" cy="16" r="7.5" fill="#FF0000" stroke="#000000" strokeWidth="1" />
    <circle cx="16" cy="16" r="6" fill="#CC0000" />
    <path d="M16 11V16" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12.5 13.5C11.5 14.5 11.5 17 13 18.5C14.5 20 17.5 20 19 18.5C20.5 17 20.5 14.5 19.5 13.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </>
);

/**
 * 16. Hard Drive / System Storage (16x16 Tray & Resource View)
 */
export const Win98HardDriveIcon = createIcon(
  <>
    {/* Hard Drive Metal Casing */}
    <rect x="3" y="7" width="26" height="18" fill="#C0C0C0" stroke="#000000" strokeWidth="1" />
    <path d="M3 7H29V8H4V24H3V7Z" fill="#FFFFFF" />
    <path d="M28 8V24H4V25H29V7H28V8Z" fill="#808080" />

    {/* Spindle Platter Circle */}
    <circle cx="12" cy="16" r="6" fill="#E0E0E0" stroke="#808080" strokeWidth="0.75" />
    <circle cx="12" cy="16" r="2" fill="#808080" stroke="#000000" strokeWidth="0.5" />
    
    {/* Read/Write Head Arm */}
    <polygon points="12,16 23,12 24,14 13,17" fill="#000080" stroke="#000000" strokeWidth="0.5" />
    <circle cx="23.5" cy="13" r="1.5" fill="#C0C0C0" stroke="#000000" strokeWidth="0.5" />

    {/* Green Activity LED */}
    <rect x="24" y="21" width="3" height="2" fill="#00FF00" stroke="#000000" strokeWidth="0.5" />
  </>
);

/**
 * 17. Volume Speaker (Tray Sound Blaster Speaker)
 */
export const Win98VolumeSpeakerIcon = createIcon(
  <>
    {/* Speaker Horn */}
    <polygon points="4,12 8,12 14,7 14,25 8,20 4,20" fill="#FFCC00" stroke="#000000" strokeWidth="1" />
    <path d="M4 12H8L14 7V8L8.5 12.5H4V12Z" fill="#FFFF80" />
    <rect x="4" y="12" width="4" height="8" fill="#808080" stroke="#000000" strokeWidth="0.75" />

    {/* Sound Waves */}
    <path d="M17 12C18 14 18 18 17 20" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M21 9C23 13 23 19 21 23" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M25 6C28 12 28 20 25 26" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </>
);

/**
 * 18. Show Desktop Blotter (Classic Quick Launch Icon)
 */
export const Win98ShowDesktopIcon = createIcon(
  <>
    {/* Desktop Notepad / Blotter */}
    <rect x="4" y="4" width="24" height="24" fill="#008080" stroke="#000000" strokeWidth="1" />
    <rect x="6" y="6" width="20" height="20" fill="#DFDFDF" stroke="#000000" strokeWidth="0.75" />
    <rect x="7" y="7" width="18" height="4" fill="#000080" />
    
    {/* Pencil laying on blotter */}
    <line x1="8" y1="20" x2="22" y2="12" stroke="#FFC800" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="8" y1="20" x2="6" y2="21" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
  </>
);

/**
 * 19. Connect Phone / Mobile Sync (Pocket PC & ActiveSync Icon)
 */
export const Win98PhoneSyncIcon = createIcon(
  <>
    {/* PDA / Smartphone Casing */}
    <rect x="7" y="2" width="18" height="28" rx="2" fill="#808080" stroke="#000000" strokeWidth="1" />
    <rect x="9" y="5" width="14" height="18" fill="#008080" stroke="#000000" strokeWidth="0.75" />
    
    {/* Stylus Antenna & Button */}
    <circle cx="16" cy="26" r="2" fill="#C0C0C0" stroke="#000000" strokeWidth="0.75" />
    <line x1="12" y1="26" x2="14" y2="26" stroke="#FFFFFF" strokeWidth="1" />
    <line x1="18" y1="26" x2="20" y2="26" stroke="#FFFFFF" strokeWidth="1" />
    
    {/* ActiveSync Circular Sync Arrows Badge */}
    <circle cx="23" cy="9" r="7" fill="#000080" stroke="#FFFFFF" strokeWidth="1" />
    <path d="M20 9C20 7.34 21.34 6 23 6C24.3 6 25.4 6.8 25.8 8M26 8H23.5M26 9C26 10.66 24.66 12 23 12C21.7 12 20.6 11.2 20.2 10M20 10H22.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

/**
 * 20. Windows Mobile 4-Color Wave Flag
 */
export const PocketWindowsFlagIcon = createIcon(
  <>
    <path d="M4 6L14 4V13H4V6Z" fill="#E81123" />
    <path d="M16 3.6L28 2V13H16V3.6Z" fill="#00B294" />
    <path d="M4 15H14V24L4 22V15Z" fill="#0078D7" />
    <path d="M16 15H28V26L16 24.4V15Z" fill="#FFB900" />
  </>
);
