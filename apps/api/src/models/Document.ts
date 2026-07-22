import mongoose,  {Schema, type InferSchemaType} from "mongoose"

const DocumentSchema = new Schema({
    title: {type: String, required: true, trim: true, default: "Untitled", minLength: 1, maxlength: 255},
    content: {type: String, default: ""},
    ownerId: {type: Schema.Types.ObjectId, ref: "Profile", required: true, index: true},
}, {timestamps: true});

export type Document = InferSchemaType<typeof DocumentSchema> & {_id: mongoose.Types.ObjectId};

export const Document = mongoose.models.Document || mongoose.model<Document>("Document", DocumentSchema);
