export interface SampleArtwork {
  id: string;
  name: string;
  category: string;
  description: string;
  svgContent: string;
}

export const SAMPLE_ARTWORKS: SampleArtwork[] = [
  {
    id: 'tropical-botanical',
    name: 'tropical_monstera_botanical_leaves.svg',
    category: 'Plants and Flowers',
    description: 'Vibrant flat vector monstera and palm jungle foliage pattern',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#064e3b" />
          <stop offset="100%" stop-color="#022c22" />
        </linearGradient>
        <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
        <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34d399" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
        <linearGradient id="flowerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e" />
          <stop offset="100%" stop-color="#be123c" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bgGrad)" />
      <!-- Palm Leaves -->
      <g transform="translate(150, 300) scale(1.4)">
        <path d="M0,0 Q60,-120 180,-100 Q100,-40 0,0" fill="url(#leafGrad1)" opacity="0.9" />
        <path d="M0,0 Q-60,-120 -180,-100 Q-100,-40 0,0" fill="url(#leafGrad2)" opacity="0.9" />
        <path d="M0,0 Q10,-160 80,-200 Q20,-100 0,0" fill="url(#leafGrad1)" />
        <path d="M0,0 Q-10,-160 -80,-200 Q-20,-100 0,0" fill="url(#leafGrad2)" />
        <path d="M0,0 Q0,-220 0,-240 Q-5,-120 0,0" stroke="#a7f3d0" stroke-width="3" fill="none" />
      </g>
      <!-- Monstera Leaf -->
      <g transform="translate(600, 260) scale(1.2)">
        <path d="M0,0 C80,-60 140,-20 160,80 C180,180 80,240 0,260 C-80,240 -180,180 -160,80 C-140,-20 -80,-60 0,0 Z" fill="url(#leafGrad2)" />
        <path d="M0,10 L0,250" stroke="#064e3b" stroke-width="6" />
        <!-- Cutouts -->
        <ellipse cx="60" cy="80" rx="30" ry="12" transform="rotate(30 60 80)" fill="#022c22" />
        <ellipse cx="80" cy="140" rx="35" ry="14" transform="rotate(20 80 140)" fill="#022c22" />
        <ellipse cx="-60" cy="80" rx="30" ry="12" transform="rotate(-30 -60 80)" fill="#022c22" />
        <ellipse cx="-80" cy="140" rx="35" ry="14" transform="rotate(-20 -80 140)" fill="#022c22" />
      </g>
      <!-- Hibiscus Flower -->
      <g transform="translate(380, 420)">
        <circle cx="0" cy="0" r="45" fill="url(#flowerGrad)" />
        <path d="M0,-45 C20,-90 60,-90 70,-45 C80,0 40,20 0,0" fill="url(#flowerGrad)" />
        <path d="M45,0 C90,20 90,60 45,70 C0,80 -20,40 0,0" fill="url(#flowerGrad)" />
        <path d="M0,45 C-20,90 -60,90 -70,45 C-80,0 -40,-20 0,0" fill="url(#flowerGrad)" />
        <path d="M-45,0 C-90,-20 -90,-60 -45,-70 C0,-80 20,-40 0,0" fill="url(#flowerGrad)" />
        <circle cx="0" cy="0" r="16" fill="#facc15" />
      </g>
      <!-- Small decorative dots -->
      <circle cx="100" cy="100" r="8" fill="#34d399" opacity="0.6" />
      <circle cx="700" cy="80" r="12" fill="#f43f5e" opacity="0.4" />
      <circle cx="720" cy="500" r="10" fill="#facc15" opacity="0.5" />
    </svg>`
  },
  {
    id: 'isometric-cloud-ai',
    name: 'isometric_ai_cloud_computing_server.svg',
    category: 'Technology',
    description: '3D Isometric cloud computing datacenter server vector illustration',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
      <defs>
        <linearGradient id="isoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b0f19" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
        <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
        <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#isoBg)" />
      <!-- Isometric Grid Base -->
      <g transform="translate(400, 360)">
        <!-- Base Platform -->
        <polygon points="0,-120 240,0 0,120 -240,0" fill="#1e293b" stroke="#0ea5e9" stroke-width="2" />
        <polygon points="-240,0 0,120 0,150 -240,30" fill="#0f172a" />
        <polygon points="0,120 240,0 240,30 0,150" fill="#090d16" />

        <!-- Isometric Server Rack 1 -->
        <g transform="translate(-100, -30)">
          <polygon points="0,-80 50,-55 0,-30 -50,-55" fill="#38bdf8" opacity="0.8" />
          <polygon points="-50,-55 0,-30 0,50 -50,25" fill="#0284c7" />
          <polygon points="0,-30 50,-55 50,25 0,50" fill="#0369a1" />
          <!-- Server LED lines -->
          <line x1="-35" y1="-10" x2="-10" y2="2" stroke="#38bdf8" stroke-width="2" />
          <line x1="-35" y1="10" x2="-10" y2="22" stroke="#34d399" stroke-width="2" />
        </g>

        <!-- Isometric Server Rack 2 -->
        <g transform="translate(100, -30)">
          <polygon points="0,-80 50,-55 0,-30 -50,-55" fill="#a855f7" opacity="0.8" />
          <polygon points="-50,-55 0,-30 0,50 -50,25" fill="#7e22ce" />
          <polygon points="0,-30 50,-55 50,25 0,50" fill="#6b21a8" />
          <line x1="-35" y1="-10" x2="-10" y2="2" stroke="#f472b6" stroke-width="2" />
          <line x1="-35" y1="10" x2="-10" y2="22" stroke="#c084fc" stroke-width="2" />
        </g>

        <!-- Central Hologram AI Core -->
        <g transform="translate(0, -110)">
          <circle cx="0" cy="0" r="45" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.7" stroke-dasharray="6,4" />
          <polygon points="0,-40 30,-15 0,10 -30,-15" fill="url(#cyanGlow)" opacity="0.9" />
          <polygon points="-30,-15 0,10 0,40 -30,15" fill="#0284c7" opacity="0.8" />
          <polygon points="0,10 30,-15 30,15 0,40" fill="#0369a1" opacity="0.8" />
          <!-- Upward laser beam -->
          <line x1="0" y1="-40" x2="0" y2="-120" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
          <!-- Floating Cloud icon -->
          <g transform="translate(0, -140) scale(0.8)">
            <path d="M-40,0 A25,25 0 0,1 10,-20 A35,35 0 0,1 50,10 A20,20 0 0,1 40,35 L-40,35 A20,20 0 0,1 -40,0 Z" fill="url(#purpleGlow)" opacity="0.9" />
          </g>
        </g>
      </g>
    </svg>`
  },
  {
    id: 'business-team-silhouette',
    name: 'corporate_business_team_growth_silhouette.svg',
    category: 'Business',
    description: 'Corporate business team reaching goal silhouette with financial growth chart',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f97316" />
          <stop offset="40%" stop-color="#fb923c" />
          <stop offset="70%" stop-color="#fdba74" />
          <stop offset="100%" stop-color="#ffedd5" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#skyGrad)" />
      <!-- Giant Sun -->
      <circle cx="400" cy="300" r="180" fill="#fef08a" opacity="0.7" />
      <!-- Growth Arrow Graph in Background -->
      <path d="M100,500 L250,420 L400,340 L550,220 L700,100" stroke="#ea580c" stroke-width="8" stroke-dasharray="10,8" fill="none" opacity="0.5" />
      <polygon points="700,80 730,110 680,120" fill="#ea580c" opacity="0.8" />
      
      <!-- Mountain Cliff Silhouette -->
      <path d="M0,600 L0,480 L180,440 L340,380 L520,320 L680,260 L800,260 L800,600 Z" fill="#0f172a" />
      
      <!-- Silhouette People -->
      <!-- Leader on Top holding flag -->
      <g transform="translate(640, 160)">
        <!-- Head -->
        <circle cx="0" cy="0" r="10" fill="#0f172a" />
        <!-- Body -->
        <path d="M-8,14 L8,14 L6,50 L-6,50 Z" fill="#0f172a" />
        <!-- Raised arm holding flag -->
        <line x1="0" y1="20" x2="25" y2="-10" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <line x1="25" y1="-10" x2="25" y2="70" stroke="#0f172a" stroke-width="4" />
        <polygon points="25,-10 65,5 25,20" fill="#dc2626" />
        <!-- Legs -->
        <line x1="-4" y1="50" x2="-12" y2="100" stroke="#0f172a" stroke-width="6" stroke-linecap="round" />
        <line x1="4" y1="50" x2="16" y2="100" stroke="#0f172a" stroke-width="6" stroke-linecap="round" />
      </g>
      
      <!-- Teammates Helping Each other -->
      <g transform="translate(480, 220)">
        <circle cx="0" cy="0" r="9" fill="#0f172a" />
        <path d="M-7,12 L7,12 L5,45 L-5,45 Z" fill="#0f172a" />
        <!-- Reaching arm -->
        <line x1="0" y1="20" x2="-35" y2="40" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <line x1="-3" y1="45" x2="-10" y2="100" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <line x1="3" y1="45" x2="10" y2="100" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
      </g>
      
      <g transform="translate(420, 270)">
        <circle cx="0" cy="0" r="9" fill="#0f172a" />
        <path d="M-7,12 L7,12 L5,45 L-5,45 Z" fill="#0f172a" />
        <line x1="0" y1="20" x2="25" y2="-10" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <line x1="-3" y1="45" x2="-15" y2="100" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <line x1="3" y1="45" x2="5" y2="100" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
      </g>
    </svg>`
  },
  {
    id: 'vintage-coffee-badge',
    name: 'vintage_artisan_coffee_roasters_badge.svg',
    category: 'Food',
    description: 'Retro vintage coffee roasters emblem badge label illustration',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
      <defs>
        <linearGradient id="woodBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1c1917" />
          <stop offset="100%" stop-color="#292524" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#woodBg)" />
      
      <g transform="translate(400, 300)">
        <!-- Outer Starburst Circle -->
        <circle cx="0" cy="0" r="220" fill="none" stroke="#d97706" stroke-width="4" stroke-dasharray="8,6" />
        <circle cx="0" cy="0" r="200" fill="#451a03" stroke="#f59e0b" stroke-width="6" />
        <circle cx="0" cy="0" r="185" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4,4" />
        
        <!-- Ribbon Banner Header -->
        <path d="M-140,-120 Q0,-100 140,-120 L150,-80 Q0,-60 -150,-80 Z" fill="#b45309" stroke="#fef3c7" stroke-width="2" />
        <text x="0" y="-88" fill="#fef3c7" font-size="18" font-weight="bold" font-family="serif" text-anchor="middle" letter-spacing="4">PREMIUM QUALITY</text>
        
        <!-- Center Coffee Cup Illustration -->
        <g transform="translate(0, 10)">
          <!-- Steam Lines -->
          <path d="M-20,-60 Q-30,-80 -15,-100" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M0,-65 Q10,-85 0,-105" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M20,-60 Q30,-80 15,-100" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round" />
          
          <!-- Cup Body -->
          <path d="M-45,-40 L45,-40 L35,25 C30,50 -30,50 -35,25 Z" fill="#fef3c7" stroke="#78350f" stroke-width="3" />
          <!-- Cup Handle -->
          <path d="M42,-30 C65,-30 65,10 37,15" fill="none" stroke="#fef3c7" stroke-width="7" stroke-linecap="round" />
          <!-- Coffee Bean on cup -->
          <ellipse cx="0" cy="-5" rx="14" ry="10" fill="#78350f" />
          <path d="M-10,-5 Q0,-1 10,-5" stroke="#fef3c7" stroke-width="2" fill="none" />
          <!-- Saucer -->
          <ellipse cx="0" cy="40" rx="65" ry="10" fill="#fef3c7" stroke="#78350f" stroke-width="3" />
        </g>
        
        <!-- Main Text -->
        <text x="0" y="105" fill="#fbbf24" font-size="28" font-weight="900" font-family="sans-serif" text-anchor="middle" letter-spacing="3">COFFEE ROASTERS</text>
        <text x="0" y="135" fill="#fef3c7" font-size="13" font-weight="600" font-family="sans-serif" text-anchor="middle" letter-spacing="5">ESTD • 1984 • ORGANIC</text>
        
        <!-- Stars -->
        <text x="-90" y="20" fill="#fbbf24" font-size="20">★ ★ ★</text>
        <text x="50" y="20" fill="#fbbf24" font-size="20">★ ★ ★</text>
      </g>
    </svg>`
  }
];

export async function createSampleFile(sample: SampleArtwork): Promise<File> {
  const blob = new Blob([sample.svgContent], { type: 'image/svg+xml' });
  return new File([blob], sample.name, { type: 'image/svg+xml' });
}
