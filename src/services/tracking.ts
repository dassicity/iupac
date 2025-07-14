import { DeviceInfo, LocationData, NetworkInfo, SessionTrackingData, UserTrackingData, PageViewData, InteractionData } from '@/types';

export class TrackingService {
    private static instance: TrackingService;
    private currentSessionId: string | null = null;
    private currentPageViewId: string | null = null;
    private pageViewStartTime: number = 0;
    private scrollDepth: number = 0;
    private clickCount: number = 0;

    static getInstance(): TrackingService {
        if (!TrackingService.instance) {
            TrackingService.instance = new TrackingService();
        }
        return TrackingService.instance;
    }

    private constructor() {
        this.initializeTracking();
    }

    private initializeTracking(): void {
        if (typeof window === 'undefined') return;

        // Track page views
        this.trackPageView();

        // Track scroll depth
        window.addEventListener('scroll', this.trackScroll.bind(this));

        // Track clicks
        document.addEventListener('click', this.trackClick.bind(this));

        // Track page unload
        window.addEventListener('beforeunload', this.trackPageExit.bind(this));

        // Track visibility changes
        document.addEventListener('visibilitychange', this.trackVisibilityChange.bind(this));
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    // Generate browser fingerprint
    private generateBrowserFingerprint(): string {
        if (typeof window === 'undefined') return '';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser fingerprint text', 2, 2);
        }

        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.cookieEnabled,
            canvas.toDataURL()
        ].join('|');

        return btoa(fingerprint).substr(0, 32);
    }

    // Get comprehensive device information
    public getDeviceInfo(): DeviceInfo {
        if (typeof window === 'undefined') {
            return {
                browser: 'Unknown',
                browserVersion: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown',
                device: 'Unknown',
                deviceType: 'desktop',
                screenResolution: '0x0',
                colorDepth: 0,
                timezone: 'Unknown',
                language: 'Unknown',
                platform: 'Unknown',
                touchSupport: false,
                cookiesEnabled: false,
                javascriptEnabled: true,
                webGLSupported: false,
                localStorageSupported: false,
                sessionStorageSupported: false,
                indexedDBSupported: false,
                webRTCSupported: false,
                geolocationSupported: false,
                doNotTrack: false,
                hardwareConcurrency: 0,
                maxTouchPoints: 0
            };
        }

        const ua = navigator.userAgent;
        const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection;

        // Parse browser info
        let browser = 'Unknown';
        let browserVersion = 'Unknown';

        if (ua.includes('Chrome')) {
            browser = 'Chrome';
            browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Firefox')) {
            browser = 'Firefox';
            browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Safari')) {
            browser = 'Safari';
            browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Edge')) {
            browser = 'Edge';
            browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
        }

        // Parse OS info
        let os = 'Unknown';
        let osVersion = 'Unknown';

        if (ua.includes('Windows')) {
            os = 'Windows';
            osVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Mac OS')) {
            os = 'macOS';
            osVersion = ua.match(/Mac OS X (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
        } else if (ua.includes('Linux')) {
            os = 'Linux';
        } else if (ua.includes('Android')) {
            os = 'Android';
            osVersion = ua.match(/Android (\d+\.\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('iOS')) {
            os = 'iOS';
            osVersion = ua.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
        }

        // Detect device type
        let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            deviceType = /iPad|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : 'mobile';
        }

        return {
            browser,
            browserVersion,
            os,
            osVersion,
            device: `${browser} on ${os}`,
            deviceType,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            cookiesEnabled: navigator.cookieEnabled,
            javascriptEnabled: true,
            webGLSupported: !!document.createElement('canvas').getContext('webgl'),
            localStorageSupported: typeof Storage !== 'undefined',
            sessionStorageSupported: typeof sessionStorage !== 'undefined',
            indexedDBSupported: typeof indexedDB !== 'undefined',
            webRTCSupported: !!(window as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection,
            geolocationSupported: !!navigator.geolocation,
            doNotTrack: navigator.doNotTrack === '1',
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
            connection: connection ? {
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink || 0,
                rtt: connection.rtt || 0,
                saveData: connection.saveData || false
            } : undefined
        };
    }

    // Get IP-based location data
    public async getLocationData(ipAddress: string): Promise<LocationData> {
        try {
            // Using ipapi.co for IP geolocation
            const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
            const data = await response.json();

            return {
                country: data.country_name || 'Unknown',
                countryCode: data.country_code || 'Unknown',
                region: data.region || 'Unknown',
                city: data.city || 'Unknown',
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                timezone: data.timezone || 'Unknown',
                isp: data.org || 'Unknown',
                approximateLocation: true,
                vpnDetected: data.threat?.is_anonymous || false,
                proxyDetected: data.threat?.is_proxy || false
            };
        } catch (error) {
            console.error('Error getting location data:', error);
            return {
                country: 'Unknown',
                countryCode: 'Unknown',
                region: 'Unknown',
                city: 'Unknown',
                latitude: 0,
                longitude: 0,
                timezone: 'Unknown',
                isp: 'Unknown',
                approximateLocation: true
            };
        }
    }

    // Get network information
    public getNetworkInfo(ipAddress: string): NetworkInfo {
        const ipVersion = ipAddress.includes(':') ? 'IPv6' : 'IPv4';

        return {
            ipAddress,
            ipVersion,
            hostname: window.location.hostname,
            asn: 'Unknown',
            organization: 'Unknown',
            connectionType: 'Unknown',
            threatLevel: 'Unknown'
        };
    }

    // Track page views
    private trackPageView(): void {
        if (typeof window === 'undefined') return;

        this.currentPageViewId = this.generateId();
        this.pageViewStartTime = Date.now();
        this.scrollDepth = 0;
        this.clickCount = 0;

        const pageView: PageViewData = {
            id: this.currentPageViewId,
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            duration: 0,
            scrollDepth: 0,
            clicks: 0,
            referrer: document.referrer || 'direct'
        };

        this.sendTrackingData('pageview', pageView);
    }

    // Track scroll depth
    private trackScroll(): void {
        if (typeof window === 'undefined') return;

        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

        this.scrollDepth = Math.max(this.scrollDepth, scrollPercent);
    }

    // Track clicks
    private trackClick(event: MouseEvent): void {
        this.clickCount++;

        const target = event.target as HTMLElement;
        const className = typeof target.className === 'string' ? target.className : String(target.className || '');
        const interaction: InteractionData = {
            id: this.generateId(),
            type: 'click',
            element: target.tagName.toLowerCase() + (target.id ? `#${target.id}` : '') + (className ? `.${className.split(' ').join('.')}` : ''),
            timestamp: new Date().toISOString(),
            coordinates: { x: event.clientX, y: event.clientY },
            data: {
                text: target.textContent?.slice(0, 100) || '',
                href: target.getAttribute('href') || undefined
            }
        };

        this.sendTrackingData('interaction', interaction);
    }

    // Track page exit
    private trackPageExit(): void {
        if (this.currentPageViewId) {
            const duration = Date.now() - this.pageViewStartTime;
            this.sendTrackingData('pageExit', {
                id: this.currentPageViewId,
                duration,
                scrollDepth: this.scrollDepth,
                clicks: this.clickCount,
                exitMethod: 'navigation'
            });
        }
    }

    // Track visibility changes
    private trackVisibilityChange(): void {
        if (document.hidden) {
            this.trackPageExit();
        } else {
            this.trackPageView();
        }
    }

    // Track specific interactions
    public trackInteraction(type: InteractionData['type'], element: string, data?: Record<string, unknown>, value?: string): void {
        const interaction: InteractionData = {
            id: this.generateId(),
            type,
            element,
            timestamp: new Date().toISOString(),
            data,
            value
        };

        this.sendTrackingData('interaction', interaction);
    }

    // Track search queries
    public trackSearch(query: string): void {
        this.trackInteraction('search', 'search-input', { query });
    }

    // Track movie actions
    public trackMovieAction(action: 'add' | 'remove', movieId: number, listName: string): void {
        this.trackInteraction(action === 'add' ? 'movie_add' : 'movie_remove', 'movie-card', {
            movieId,
            listName
        });
    }

    // Track ratings
    public trackRating(movieId: number, rating: number): void {
        this.trackInteraction('rating', 'rating-component', {
            movieId,
            rating
        });
    }

    // Create new session
    public async createSession(userId: string, ipAddress: string): Promise<SessionTrackingData> {
        this.currentSessionId = this.generateId();

        const deviceInfo = this.getDeviceInfo();
        const locationData = await this.getLocationData(ipAddress);

        const session: SessionTrackingData = {
            id: this.currentSessionId,
            sessionStart: new Date().toISOString(),
            ipAddress,
            userAgent: navigator.userAgent || 'Unknown',
            referrer: document.referrer || 'direct',
            deviceInfo,
            locationData,
            pageViews: [],
            interactions: []
        };

        return session;
    }

    // Initialize user tracking data
    public async initializeUserTracking(userId: string, ipAddress: string): Promise<UserTrackingData> {
        const deviceInfo = this.getDeviceInfo();
        const locationData = await this.getLocationData(ipAddress);
        const networkInfo = this.getNetworkInfo(ipAddress);
        const session = await this.createSession(userId, ipAddress);

        return {
            sessions: [session],
            deviceInfo,
            browserFingerprint: this.generateBrowserFingerprint(),
            firstVisit: new Date().toISOString(),
            totalSessions: 1,
            lastUpdated: new Date().toISOString(),
            locationData,
            networkInfo,
            behaviorData: {
                totalPageViews: 0,
                totalInteractions: 0,
                averageSessionDuration: 0,
                mostVisitedPages: [],
                searchQueries: [],
                moviesAdded: 0,
                moviesRated: 0,
                journalEntries: 0,
                customListsCreated: 0,
                lastActivity: new Date().toISOString()
            }
        };
    }

    // Send tracking data to server
    private async sendTrackingData(type: string, data: unknown): Promise<void> {
        try {
            const currentUser = localStorage.getItem('current_user');
            if (!currentUser) return;

            const user = JSON.parse(currentUser);

            await fetch('/api/tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    sessionId: this.currentSessionId,
                    type,
                    data,
                    timestamp: new Date().toISOString()
                }),
            });
        } catch (error) {
            console.error('Error sending tracking data:', error);
        }
    }

    // Get client-side tracking data for server requests
    public getClientTrackingData(): Record<string, unknown> {
        return {
            userAgent: navigator.userAgent || 'Unknown',
            referrer: document.referrer || 'direct',
            deviceInfo: this.getDeviceInfo(),
            browserFingerprint: this.generateBrowserFingerprint(),
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
        };
    }
}

export const trackingService = TrackingService.getInstance(); 