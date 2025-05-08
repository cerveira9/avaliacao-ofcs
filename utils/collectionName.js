const getCollectionName = (baseName) => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? `${baseName}_teste` : baseName;
  };
  
  module.exports = getCollectionName;
  