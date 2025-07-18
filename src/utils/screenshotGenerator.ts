import { persistenceManager } from './persistenceManager';

interface ScreenshotConfig {
  device: 'iPhone' | 'iPad' | 'iPhonePro';
  orientation: 'portrait' | 'landscape';
  language: string;
  theme: 'light' | 'dark';
}

interface ScreenshotData {
  step: string;
  title: string;
  description: string;
  features: string[];
  deviceFrame: string;
}

export class ScreenshotGenerator {
  private static readonly DEVICE_FRAMES = {
    iPhone: {
      width: 1170,
      height: 2532,
      frame: 'iphone-14-pro'
    },
    iPhonePro: {
      width: 1290,
      height: 2796,
      frame: 'iphone-14-pro-max'
    },
    iPad: {
      width: 2048,
      height: 2732,
      frame: 'ipad-pro-12-9'
    }
  };

  static async generateScreenshots() {
    const screenshots = [
      {
        step: 'onboarding_welcome',
        title: 'Welcome to StyleAI',
        description: 'Discover your perfect style with AI-powered analysis',
        features: ['Personalized style assessment', 'AI-powered recommendations', 'Professional insights'],
        deviceFrame: 'iPhone'
      },
      {
        step: 'onboarding_analysis',
        title: 'AI Style Analysis',
        description: 'Upload a photo and get instant style insights',
        features: ['Instant analysis', 'Detailed breakdown', 'Professional recommendations'],
        deviceFrame: 'iPhone'
      },
      {
        step: 'results_display',
        title: 'Your Style Results',
        description: 'Comprehensive analysis with actionable insights',
        features: ['Style score', 'Color analysis', 'Body type insights', 'Personality matching'],
        deviceFrame: 'iPhone'
      },
      {
        step: 'premium_features',
        title: 'Unlock Premium Features',
        description: 'Get unlimited analysis and advanced insights',
        features: ['Unlimited analysis', 'Advanced recommendations', 'Style evolution tracking'],
        deviceFrame: 'iPhone'
      },
      {
        step: 'dashboard',
        title: 'Your Style Dashboard',
        description: 'Track your style journey and progress',
        features: ['Progress tracking', 'Style history', 'Recommendations', 'Analytics'],
        deviceFrame: 'iPhone'
      }
    ];

    return screenshots;
  }

  static getDeviceSpecificConfig(device: string): ScreenshotConfig {
    switch (device) {
      case 'iPhone':
        return {
          device: 'iPhone',
          orientation: 'portrait',
          language: 'en',
          theme: 'dark'
        };
      case 'iPad':
        return {
          device: 'iPad',
          orientation: 'landscape',
          language: 'en',
          theme: 'dark'
        };
      default:
        return {
          device: 'iPhone',
          orientation: 'portrait',
          language: 'en',
          theme: 'dark'
        };
    }
  }

  static async createScreenshotHTML(screenshot: ScreenshotData, config: ScreenshotConfig): Promise<string> {
    const deviceFrame = this.DEVICE_FRAMES[config.device];
    
    return `
      <!DOCTYPE html>
      <html lang="${config.language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${screenshot.title}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .device-frame {
            width: ${deviceFrame.width}px;
            height: ${deviceFrame.height}px;
            background: #000;
            border-radius: 40px;
            padding: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            position: relative;
          }
          
          .screen {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            border-radius: 30px;
            padding: 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: white;
          }
          
          .title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 16px;
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .description {
            font-size: 18px;
            margin-bottom: 32px;
            opacity: 0.9;
            max-width: 400px;
            line-height: 1.5;
          }
          
          .features {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 32px;
          }
          
          .feature {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 16px;
            opacity: 0.8;
          }
          
          .feature-icon {
            width: 20px;
            height: 20px;
            background: #feca57;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #1a1a2e;
          }
          
          .cta-button {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          }
          
          .cta-button:hover {
            transform: scale(1.05);
          }
        </style>
      </head>
      <body>
        <div class="device-frame">
          <div class="screen">
            <h1 class="title">${screenshot.title}</h1>
            <p class="description">${screenshot.description}</p>
            <div class="features">
              ${screenshot.features.map(feature => `
                <div class="feature">
                  <div class="feature-icon">✓</div>
                  <span>${feature}</span>
                </div>
              `).join('')}
            </div>
            <button class="cta-button">Get Started</button>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}