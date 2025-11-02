import mongoose from "mongoose";

export default class BaseModel {
  /**
   * @param {string} name - Tên model (ví dụ: 'User')
   * @param {mongoose.Schema} schema - Schema mongoose
   */
  constructor(name, schema) {
    if (!name || !schema) {
      throw new Error("Model name & schema are required");
    }

    // ✅ Tự động thêm createdAt & updatedAt
    schema.set("timestamps", true);

    // ✅ Tránh OverwriteModelError nếu model đã tồn tại
    this.Model = mongoose.models[name] || mongoose.model(name, schema);
  }

  // ===== ⚙️ CRUD cơ bản =====

  async create(data) {
    return this.Model.create(data);
  }

  async find(filter = {}, projection = null, options = {}) {
    return this.Model.find(filter, projection, options).lean();
  }

  async findById(id) {
    return this.Model.findById(id);
  }
  async findOne(filter = {}, projection = null, options = {}) {
    return this.Model.findOne(filter, projection, options);
  }
  async update(id, data) {
    return this.Model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return this.Model.findByIdAndDelete(id);
  }
  async deleteMany(filter) {
    return this.Model.deleteMany(filter);
  }
  async count(filter = {}) {
    return this.Model.countDocuments(filter);
  }

  // ===== 📄 Tiện ích bổ sung =====

  async paginate(filter = {}, { page = 1, limit = 10, sort = { createdAt: -1 } } = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.Model.find(filter).sort(sort).skip(skip).limit(limit),
      this.Model.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }
}