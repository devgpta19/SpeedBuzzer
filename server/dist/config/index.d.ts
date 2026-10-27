export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly isDev: boolean;
    readonly db: {
        readonly host: string;
        readonly port: number;
        readonly user: string;
        readonly password: string;
        readonly database: string;
        readonly ssl: boolean;
    };
    readonly session: {
        readonly secret: string;
    };
    readonly cors: {
        readonly clientUrl: string;
    };
    readonly ai: {
        readonly provider: string;
        readonly apiKey: string;
        readonly model: string;
    };
    readonly rateLimits: {
        readonly windowMs: number;
        readonly maxRequests: number;
        readonly buzzPerSecond: number;
    };
};
