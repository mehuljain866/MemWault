# Future Ideas & Backlog

## Mobile Viewer App (Folder Sync)
- **Concept**: A viewer app (Native Mobile App or PWA) that the user opens on their phone to view the MemWault metadata.
- **Workflow**: 
  - User syncs the `.mp4` and `.jpg` files to their phone (e.g., via Google Drive, iCloud, or Syncthing).
  - The app is pointed to that specific local folder.
  - The app automatically reads all files in the folder, parses the `XMP-Memwault:MomData`, and displays the timeline and rich UI (hearts, comments, viewers) without needing a backend server connection.
- **Technical Constraint**: Since mobile browsers (Safari/Chrome for Android) block the File System Access API (`showDirectoryPicker`), a PWA cannot have persistent background access to a folder. The user would have to manually "Select Folder" on every launch. 
- **Solution**: To make it seamless ("automatically read all files in that folder"), this would need to be built as a lightweight Native App (React Native/Expo) that can request permanent iOS/Android Storage permissions.

## Location Metadata Distinction
- **Concept**: Differentiate between `device_location` (the exact GPS coordinates captured by the raw camera sensor) and `instagram_location` (the location sticker manually added in the IG editor).
- **Current Limitation**: Instagram strips all original EXIF/GPS data from media when it's uploaded. The Instagram API only provides the `instagram_location` (sticker). To get `device_location`, MemWault would need to cross-reference the downloaded story with the original file on the user's camera roll.
