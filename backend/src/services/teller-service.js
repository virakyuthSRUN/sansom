const axios = require('axios');
const fs = require('fs');
const https = require('https');
const path = require('path');

class TellerService {
  constructor() {
    // Load certificate paths from environment
    this.certPath = path.resolve(process.env.TELLER_CERT_PATH);
    this.keyPath = path.resolve(process.env.TELLER_KEY_PATH);
    this.baseUrl = 'https://api.teller.io';
    
    // Verify certificates exist
    if (!fs.existsSync(this.certPath) || !fs.existsSync(this.keyPath)) {
      console.error('❌ Certificate files not found!');
      console.error(`Cert path: ${this.certPath}`);
      console.error(`Key path: ${this.keyPath}`);
      throw new Error('Teller certificates missing');
    }
    
    // Create HTTPS agent with mTLS certificates
    this.httpsAgent = new https.Agent({
      cert: fs.readFileSync(this.certPath),
      key: fs.readFileSync(this.keyPath),
      rejectUnauthorized: process.env.NODE_ENV === 'production' // Only reject in production
    });
    
    console.log('✅ TellerService initialized');
  }

  /**
   * Get all accounts for a user
   * @param {string} accessToken - Teller access token
   * @returns {Promise<Array>} List of accounts
   */
  async getAccounts(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/accounts`, {
        httpsAgent: this.httpsAgent,
        auth: {
          username: accessToken,
          password: '' // Teller uses access token as username with blank password
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Teller getAccounts error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get transactions for a specific account
   * @param {string} accessToken - Teller access token
   * @param {string} accountId - Account ID
   * @param {Object} options - Optional parameters (fromDate, toDate)
   * @returns {Promise<Array>} List of transactions
   */
  async getTransactions(accessToken, accountId, options = {}) {
    try {
      let url = `${this.baseUrl}/accounts/${accountId}/transactions`;
      
      // Add date filters if provided
      const params = new URLSearchParams();
      if (options.fromDate) params.append('from', options.fromDate);
      if (options.toDate) params.append('to', options.toDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, {
        httpsAgent: this.httpsAgent,
        auth: {
          username: accessToken,
          password: ''
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Teller getTransactions error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get balances for a specific account
   * @param {string} accessToken - Teller access token
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Account balance
   */
  async getBalances(accessToken, accountId) {
    try {
      const response = await axios.get(`${this.baseUrl}/accounts/${accountId}/balances`, {
        httpsAgent: this.httpsAgent,
        auth: {
          username: accessToken,
          password: ''
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Teller getBalances error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get account details
   * @param {string} accessToken - Teller access token
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Account details
   */
  async getAccountDetails(accessToken, accountId) {
    try {
      const response = await axios.get(`${this.baseUrl}/accounts/${accountId}/details`, {
        httpsAgent: this.httpsAgent,
        auth: {
          username: accessToken,
          password: ''
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Teller getAccountDetails error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get all transactions across all accounts
   * @param {string} accessToken - Teller access token
   * @param {Object} options - Optional parameters
   * @returns {Promise<Array>} All transactions with account info
   */
  async getAllTransactions(accessToken, options = {}) {
    try {
      // First get all accounts
      const accounts = await this.getAccounts(accessToken);
      
      // Then get transactions for each account
      let allTransactions = [];
      for (const account of accounts) {
        const transactions = await this.getTransactions(accessToken, account.id, options);
        
        // Format each transaction with account context
        const formatted = transactions.map(tx => 
          this.formatTransaction(tx, account)
        );
        
        allTransactions = [...allTransactions, ...formatted];
      }
      
      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return allTransactions;
    } catch (error) {
      console.error('❌ Teller getAllTransactions error:', error);
      throw error;
    }
  }

  /**
   * Format Teller transaction to match your app's format
   * @param {Object} tx - Raw Teller transaction
   * @param {Object} account - Account object
   * @returns {Object} Formatted transaction
   */
  formatTransaction(tx, account) {
    return {
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: Math.abs(parseFloat(tx.amount)),
      type: parseFloat(tx.amount) < 0 ? 'outflow' : 'inflow',
      category: this.categorizeTransaction(tx, account),
      merchant: tx.details?.counterparty?.name || tx.description.split(' ')[0],
      paymentMethod: tx.type === 'card_payment' ? 'Card' : 'Transfer',
      bank: account.institution.name,
      accountName: account.name,
      accountType: account.type,
      accountLastFour: account.last_four,
      status: tx.status,
      runningBalance: tx.running_balance ? parseFloat(tx.running_balance) : null,
      pending: tx.status === 'pending'
    };
  }

  /**
   * Categorize transaction based on description and merchant
   * @param {Object} tx - Raw Teller transaction
   * @param {Object} account - Account object
   * @returns {string} Category (Food, Transport, Shopping, etc.)
   */
  categorizeTransaction(tx, account) {
    // Use Teller's built-in category if available
    if (tx.details?.category) {
      const category = tx.details.category.toLowerCase();
      if (category.includes('food') || category.includes('restaurant')) return 'Food';
      if (category.includes('transport')) return 'Transport';
      if (category.includes('shopping')) return 'Shopping';
      if (category.includes('entertainment')) return 'Entertainment';
      if (category.includes('bills')) return 'Bills';
    }
    
    // Check account type for BNPL detection
    if (account.subtype?.includes('bnpl') || account.name?.toLowerCase().includes('bnpl')) {
      return 'BNPL';
    }
    
    // Fallback to description matching
    const desc = tx.description.toLowerCase();
    const merchant = tx.details?.counterparty?.name?.toLowerCase() || '';
    const fullText = `${desc} ${merchant}`;
    
    if (fullText.includes('restaurant') || fullText.includes('cafe') || 
        fullText.includes('food') || fullText.includes('grocery')) {
      return 'Food';
    }
    if (fullText.includes('uber') || fullText.includes('lyft') || 
        fullText.includes('taxi') || fullText.includes('grab')) {
      return 'Transport';
    }
    if (fullText.includes('atm') || fullText.includes('withdrawal')) {
      return 'Cash';
    }
    if (fullText.includes('payment') || fullText.includes('transfer')) {
      return 'Transfer';
    }
    if (fullText.includes('amazon') || fullText.includes('mall') || 
        fullText.includes('shop') || fullText.includes('store')) {
      return 'Shopping';
    }
    
    return 'Other';
  }

  /**
   * Calculate spending by category
   * @param {Array} transactions - Formatted transactions
   * @returns {Object} Category totals
   */
  calculateCategorySpend(transactions) {
    const categoryTotals = {};
    let totalSpent = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'outflow') {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        totalSpent += tx.amount;
      }
    });
    
    return { categoryTotals, totalSpent };
  }
}

module.exports = TellerService;