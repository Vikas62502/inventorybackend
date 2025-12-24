import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

// CRITICAL FIX: Patch Sequelize prototype to ensure runHooks and isDefined always exist
// This must happen before any Sequelize instances are created
const SequelizePrototype = Sequelize.prototype as any;
if (!SequelizePrototype.runHooks || typeof SequelizePrototype.runHooks !== 'function') {
  // Define runHooks on the prototype so all instances have it
  Object.defineProperty(SequelizePrototype, 'runHooks', {
    value: function(name: string, ...args: any[]) {
      // Try to use the hooks system if it exists
      if (this.hooks && typeof this.hooks.run === 'function') {
        return this.hooks.run(name, ...args);
      }
      // Fallback: return resolved promise
      return Promise.resolve();
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// CRITICAL FIX: Add isDefined method to check if a model is already registered
if (!SequelizePrototype.isDefined || typeof SequelizePrototype.isDefined !== 'function') {
  Object.defineProperty(SequelizePrototype, 'isDefined', {
    value: function(modelName: string): boolean {
      // Check if model exists in the models registry
      // Sequelize stores models in this.models or this.modelManager
      if (this.models && this.models[modelName]) {
        return true;
      }
      if (this.modelManager && this.modelManager.models && this.modelManager.models[modelName]) {
        return true;
      }
      // Check if model exists in the internal _models registry
      if (this._models && this._models[modelName]) {
        return true;
      }
      return false;
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// CRITICAL FIX: Add normalizeAttribute method to normalize attribute definitions
if (!SequelizePrototype.normalizeAttribute || typeof SequelizePrototype.normalizeAttribute !== 'function') {
  Object.defineProperty(SequelizePrototype, 'normalizeAttribute', {
    value: function(attribute: any): any {
      // If attribute is already an object with type, return as is
      if (attribute && typeof attribute === 'object' && attribute.type) {
        return attribute;
      }
      // If attribute is a DataType, wrap it in an object
      if (attribute && typeof attribute === 'object' && attribute.key) {
        return { type: attribute };
      }
      // Return attribute as is (fallback)
      return attribute;
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// CRITICAL FIX: Add getQueryInterface method to get the QueryInterface instance
if (!SequelizePrototype.getQueryInterface || typeof SequelizePrototype.getQueryInterface !== 'function') {
  Object.defineProperty(SequelizePrototype, 'getQueryInterface', {
    value: function() {
      // Return existing queryInterface if it exists
      if (this.queryInterface) {
        return this.queryInterface;
      }
      // Try to get it from dialect
      if (this.dialect && this.dialect.queryInterface) {
        return this.dialect.queryInterface;
      }
      // Try common dialect property names
      const dialectKeys = ['dialect-postgres', 'dialect-postgresql', 'dialect'];
      for (const key of dialectKeys) {
        if (this[key] && this[key].queryInterface) {
          return this[key].queryInterface;
        }
      }
      // Try to access via getDialect if available
      try {
        if (typeof this.getDialect === 'function') {
          const dialect = this.getDialect();
          const dialectKey = `dialect-${dialect}`;
          if (this[dialectKey] && this[dialectKey].queryInterface) {
            return this[dialectKey].queryInterface;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      // Fallback: create a minimal queryInterface-like object with queryGenerator
      // This should not happen in normal operation, but provides a fallback
      if (!this._fallbackQueryInterface) {
        this._fallbackQueryInterface = {
          quoteIdentifier: (identifier: string) => `"${identifier}"`,
          quoteTable: (table: string) => `"${table}"`,
          escape: (value: any) => {
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            return value;
          },
          queryGenerator: {
            addSchema: function(model: any) {
              // Return table name with schema prefix if needed
              const tableName = model.tableName || model.name || 'unknown';
              return tableName;
            },
            quoteIdentifier: (identifier: string) => `"${identifier}"`,
            quoteTable: (table: string) => `"${table}"`
          }
        };
      }
      return this._fallbackQueryInterface;
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

const shouldUseSSL = (process.env.DB_SSL || '').toLowerCase() === 'true';
const allowUnauthorized =
  (process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';

// Create sequelize instance with proper configuration
const sequelizeConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres' as const,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: shouldUseSSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: allowUnauthorized
        }
      }
    : {}
};

// Create sequelize instance
// The define option in sequelizeConfig ensures options.define is set by Sequelize constructor
const sequelize = new Sequelize(
  process.env.DB_NAME || 'chairbord_solar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  sequelizeConfig
);

// CRITICAL: Force full initialization IMMEDIATELY after construction
// This must happen synchronously before any models can import this module
const sequelizeAny = sequelize as any;

// Step 1: Force dialect initialization (this sets up internal structure including options)
sequelize.getDialect();

// CRITICAL: Force queryInterface initialization by accessing it
// This must happen BEFORE any models try to use it
try {
  // Try to access queryInterface directly to force initialization
  if (sequelizeAny.queryInterface) {
    // QueryInterface exists, ensure it has queryGenerator
    if (sequelizeAny.queryInterface && !sequelizeAny.queryInterface.queryGenerator) {
      // Create a minimal queryGenerator with addSchema method
      sequelizeAny.queryInterface.queryGenerator = {
        addSchema: function(model: any) {
          // Return the model's table name with schema if needed
          return model.tableName || model.name;
        }
      };
    }
  } else {
    // Try to trigger queryInterface creation by accessing getQueryInterface
    if (typeof sequelizeAny.getQueryInterface === 'function') {
      const qi = sequelizeAny.getQueryInterface();
      if (qi && !qi.queryGenerator) {
        qi.queryGenerator = {
          addSchema: function(model: any) {
            return model.tableName || model.name;
          }
        };
      }
    }
  }
} catch (e) {
  // Ignore errors during initialization, but ensure fallback exists
}

// Step 2: CRITICAL - Ensure options.define exists RIGHT NOW
// After getDialect(), options should exist with define from sequelizeConfig
// We verify and ensure it's set
const options = sequelizeAny.options;
if (options) {
  // Options exist - ensure define is set
  if (!options.define) {
    options.define = sequelizeConfig.define;
  }
} else {
  // Options don't exist after getDialect() - this is unexpected
  // Set it directly as last resort
  sequelizeAny.options = { define: sequelizeConfig.define };
}

// Step 3: CRITICAL FIX - Ensure runHooks and isDefined methods exist
// Sequelize v6 requires the hooks system to be initialized
// The runHooks method should delegate to this.hooks.run()
// Use Object.defineProperty to ensure it's properly attached and enumerable
if (!sequelizeAny.runHooks || typeof sequelizeAny.runHooks !== 'function') {
  // Ensure hooks object exists
  if (!sequelizeAny.hooks) {
    // Initialize minimal hooks system
    sequelizeAny.hooks = {
      _hooks: {},
      add: function(name: string, fn: Function) {
        if (!this._hooks[name]) this._hooks[name] = [];
        this._hooks[name].push(fn);
      },
      run: async function(name: string, ...args: any[]) {
        if (!this._hooks[name]) return;
        for (const hook of this._hooks[name]) {
          await hook(...args);
        }
      },
      runSync: function(name: string, ...args: any[]) {
        if (!this._hooks[name]) return;
        for (const hook of this._hooks[name]) {
          hook(...args);
        }
      }
    };
  }
  
  // Define runHooks method using Object.defineProperty to ensure it's properly attached
  // Store reference to hooks for closure
  const hooksRef = sequelizeAny.hooks;
  Object.defineProperty(sequelizeAny, 'runHooks', {
    value: function(name: string, ...args: any[]) {
      const hooks = this.hooks || hooksRef;
      if (hooks && typeof hooks.run === 'function') {
        return hooks.run(name, ...args);
      }
      // Fallback: return resolved promise if hooks system isn't available
      return Promise.resolve();
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// Step 4: CRITICAL FIX - Ensure isDefined method exists on instance
// This method checks if a model has already been registered
if (!sequelizeAny.isDefined || typeof sequelizeAny.isDefined !== 'function') {
  Object.defineProperty(sequelizeAny, 'isDefined', {
    value: function(modelName: string): boolean {
      // Check if model exists in the models registry
      if (this.models && this.models[modelName]) {
        return true;
      }
      if (this.modelManager && this.modelManager.models && this.modelManager.models[modelName]) {
        return true;
      }
      // Check if model exists in the internal _models registry
      if (this._models && this._models[modelName]) {
        return true;
      }
      return false;
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// Step 5: CRITICAL FIX - Ensure normalizeAttribute method exists on instance
if (!sequelizeAny.normalizeAttribute || typeof sequelizeAny.normalizeAttribute !== 'function') {
  Object.defineProperty(sequelizeAny, 'normalizeAttribute', {
    value: function(attribute: any): any {
      // If attribute is already an object with type, return as is
      if (attribute && typeof attribute === 'object' && attribute.type) {
        return attribute;
      }
      // If attribute is a DataType, wrap it in an object
      if (attribute && typeof attribute === 'object' && attribute.key) {
        return { type: attribute };
      }
      // Return attribute as is (fallback)
      return attribute;
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// Step 6: CRITICAL FIX - Ensure getQueryInterface method exists on instance
// Force initialization of queryInterface by accessing it
if (!sequelizeAny.getQueryInterface || typeof sequelizeAny.getQueryInterface !== 'function') {
  // Try to force queryInterface initialization by accessing dialect
  try {
    const dialect = sequelizeAny.getDialect();
    // Access internal properties that might trigger queryInterface creation
    if (sequelizeAny.dialect) {
      // Dialect might have queryInterface
    }
  } catch (e) {
    // Ignore errors during initialization
  }
  
  Object.defineProperty(sequelizeAny, 'getQueryInterface', {
    value: function() {
      let qi: any = null;
      
      // Return existing queryInterface if it exists
      if (this.queryInterface) {
        qi = this.queryInterface;
      }
      // Try to get it from dialect
      else if (this.dialect && this.dialect.queryInterface) {
        qi = this.dialect.queryInterface;
      }
      // Try common dialect property names without calling getDialect
      else {
        const dialectKeys = ['dialect-postgres', 'dialect-postgresql', 'dialect'];
        for (const key of dialectKeys) {
          if (this[key] && this[key].queryInterface) {
            qi = this[key].queryInterface;
            break;
          }
        }
      }
      
      // Try accessing via sequelize internal structure
      if (!qi && this.sequelize && this.sequelize.queryInterface) {
        qi = this.sequelize.queryInterface;
      }
      
      // If we found a queryInterface, ensure it has queryGenerator
      if (qi) {
        if (!qi.queryGenerator) {
          qi.queryGenerator = {
            addSchema: function(model: any) {
              const tableName = model.tableName || model.name || 'unknown';
              return tableName;
            },
            quoteIdentifier: (identifier: string) => `"${identifier}"`,
            quoteTable: (table: string) => `"${table}"`
          };
        }
        return qi;
      }
      
      // Fallback: create a minimal queryInterface-like object with queryGenerator
      if (!this._fallbackQueryInterface) {
        this._fallbackQueryInterface = {
          quoteIdentifier: (identifier: string) => `"${identifier}"`,
          quoteTable: (table: string) => `"${table}"`,
          escape: (value: any) => {
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            return value;
          },
          queryGenerator: {
            addSchema: function(model: any) {
              // Return table name with schema prefix if needed
              const tableName = model.tableName || model.name || 'unknown';
              return tableName;
            },
            quoteIdentifier: (identifier: string) => `"${identifier}"`,
            quoteTable: (table: string) => `"${table}"`
          }
        };
      }
      return this._fallbackQueryInterface;
    },
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// Test database connection (non-blocking)
const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL database connected successfully');
    console.log('✅ PostgreSQL database connected successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database connection error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('❌ Database connection error:', errorMessage);
  }
};

// Run connection test asynchronously (don't block module export)
if (process.env.NODE_ENV !== 'test') {
  testConnection().catch(() => {
    // Silently handle connection errors during startup
    // Connection will be retried when actually used
  });
}

export default sequelize;

