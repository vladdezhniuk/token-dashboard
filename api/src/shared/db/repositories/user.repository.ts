export interface User {
    id: string;
    wallet_address: string;
    created_at: Date;
}

export interface UserRepository {
    upsertByWallet(walletAddress: string): Promise<User>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
