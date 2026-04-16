# MusicGPT - AI Music Generator

A fully functional AI music generation web application built with React, Vite, and Tailwind CSS. This application simulates a transformer-based AI music generation system with a beautiful, interactive interface.

## Features

### 🎵 **Music Generation**
- **Text-to-Music**: Describe the music you want to generate using natural language
- **Genre Selection**: Choose from 12 different music genres (Electronic, Pop, Rock, Classical, Jazz, Hip-Hop, Ambient, LoFi, Synthwave, Orchestral, Folk, Blues)
- **Mood Control**: Select from 11 different moods (Uplifting, Melancholic, Energetic, Calm, Dark, Romantic, Epic, Mysterious, Happy, Sad, Focused)
- **Duration Control**: Adjust music length from 5 to 30 seconds
- **Tempo Control**: Set BPM from 60 to 200

### 🎨 **User Interface**
- **Dark Theme**: Beautiful gradient dark theme with purple/pink accents
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Interactive Controls**: Sliders, buttons, and selectors with smooth animations
- **Audio Player**: Built-in audio player with download functionality
- **Generation History**: Track your recent music generations

### 🚀 **Technical Features**
- **Mock API Integration**: Simulates real AI music generation with 2-second delay
- **Audio Playback**: Stream and play generated music directly in the browser
- **Download Functionality**: Download generated music as MP3 files
- **Preset Prompts**: Quick-start with professionally crafted music descriptions
- **Real-time Feedback**: Visual feedback during generation process

## How to Use

### 1. Describe Your Music
Enter a detailed description of the music you want to generate. For example:
- "uplifting electronic music with synth melodies and driving beat"
- "epic orchestral soundtrack for a fantasy adventure"
- "chill lofi beats for studying and relaxation"

### 2. Select Parameters
- **Genre**: Choose the musical style
- **Mood**: Set the emotional tone
- **Duration**: Set how long the music should be (5-30 seconds)
- **Tempo**: Adjust the beats per minute (60-200 BPM)

### 3. Generate Music
Click the "Generate Music" button. The system will:
1. Show a loading animation
2. Simulate AI processing (2 seconds)
3. Load and play the generated music
4. Add the generation to your history

### 4. Play & Download
- Use the built-in audio player to listen to your music
- Adjust volume and playback controls
- Download the music as an MP3 file

## Preset Prompts

Try these ready-to-use prompts:
- Epic orchestral soundtrack for a fantasy adventure
- Chill lofi beats for studying and relaxation
- Energetic synthwave with retro 80s vibes
- Melancholic piano piece with rain sounds
- Upbeat pop track with catchy melodies
- Dark ambient music for horror games
- Jazzy lounge music with smooth saxophone
- Uplifting trance with euphoric breakdown

## Technical Implementation

### Frontend
- **React 19**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS 4**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library

### Audio Features
- **HTML5 Audio API**: Native browser audio playback
- **Blob Handling**: Audio file generation and download
- **Mock API**: Simulated AI music generation with realistic timing

### UI/UX
- **Glass Morphism**: Modern glass-like UI elements
- **Gradient Borders**: Animated gradient borders
- **Smooth Animations**: CSS animations and transitions
- **Responsive Grid**: Flexible layout system

## Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # Custom styles and animations
├── main.tsx         # Application entry point
public/              # Static assets
index.html          # HTML template
vite.config.ts      # Vite configuration
package.json        # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration Notes

This application currently uses a **mock API** that simulates AI music generation. In a production environment, you would integrate with:

### Real AI Music APIs
1. **Hugging Face MusicGen**: `facebook/musicgen-small` model
2. **Google MusicLM**: Text-to-music generation
3. **Mubert API**: Professional music generation
4. **Soundraw API**: Royalty-free music generation

### Integration Steps
1. Get API keys from the chosen service
2. Replace the mock API call with real API integration
3. Handle audio streaming and processing
4. Implement error handling and rate limiting

## Future Enhancements

### Planned Features
- **Real AI Integration**: Connect to Hugging Face MusicGen API
- **MIDI Export**: Download generated music as MIDI files
- **Advanced Controls**: Key signature, time signature, instrument selection
- **Collaborative Features**: Share and remix generated music
- **User Accounts**: Save favorites and create playlists

### Technical Improvements
- **Web Audio API**: Advanced audio visualization
- **Web Workers**: Offload audio processing
- **PWA Support**: Install as a progressive web app
- **Offline Mode**: Cache generated music locally

## License

This project is for educational and demonstration purposes. The mock audio samples are from Mixkit and are free to use.

## Acknowledgments

- **Hugging Face** for the MusicGen model
- **Meta AI** for the original MusicGen research
- **Mixkit** for free audio samples
- **Lucide** for beautiful icons
- **Tailwind CSS** for the amazing utility framework

---

