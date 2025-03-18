class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // Create a shallow copy of `req.query` to ensure we don't directly modify the original request query parameters
    const queryObj = { ...this.queryString };
    // 1A) Filtering
    ///Define fields that should be excluded from the query object
    const excludedFields = ['page', 'sort', 'limit', 'fields'];

    // Iterate over the excluded fields and remove them from the query object
    excludedFields.forEach((el) => delete queryObj[el]);

    //1B)Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    return this;

    //query is not the data yet; it's a query object that contains the logic for how MongoDB should search for documents.

    // let query = Tour.find(JSON.parse(queryStr));
  }

  sort() {
    if (this.queryString.sort) {
      // Split the `sort` string by commas (e.g., "price,rating" becomes ["price", "rating"])
      const sortBy = this.queryString.sort.split(',').join(' ');
      // Join the array back into a space-separated string (e.g., "price rating")
      // This format is required by MongoDB's `.sort()` method.
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join('');
      // Use `.select()` to include only the specified fields in the query results
      // MongoDB will only return the fields specified in `fields`
      this.query = this.query.select(fields);
    } else {
      // Prefixing a field name with `-` excludes it from the results
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // Defaults to page 1
    const limit = this.queryString.limit * 1 || 100; // Defaults to a limit of 100 results per page

    // Calculate the number of documents to skip based on the current page and limit
    const skip = (page - 1) * limit;

    // Apply `.skip()` to exclude the first `skip` results
    // Apply `.limit()` to return only `limit` results
    this.query = this.query.skip(skip).limit(limit);

    return this; // Return the instance to allow method chaining
  }
}

module.exports = APIFeatures;
