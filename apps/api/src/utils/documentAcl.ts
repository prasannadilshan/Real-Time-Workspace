import { Document } from "../models/Document.js";
import { Collaborator } from "../models/Collaborator.js";
import { Profile } from "../models/Profile.js";
import type { Profile as ProfileType } from "../models/Profile.js";
import { AppError } from "./appError.js";

export const assertIsDocumentOwner = async (profileId: string, documentId: string) => {
    const document = await Document.findById(documentId);
    if(!document) {
        console.log("Document not found");
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    if(document.ownerId.toString() !== profileId) {
        console.log("Unauthorized");
        throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }
}

export const assertNotDocumentOwner = async (profileId: string, documentId: string) => {
    const document = await Document.findById(documentId);
    if(!document) {
        console.log("Document not found");
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    if(document.ownerId.toString() === profileId) {
        console.log("Unauthorized");
        throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }
}

export const assertCanReadDocument = async (profileId: string, documentId: string) => {
    const document = await Document.findById(documentId);
    if(!document) {
        console.log("Document not found");
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const collaborator = await Collaborator.findOne({documentId, profileId});
    if(!collaborator && document.ownerId.toString() !== profileId) {
        console.log("Unauthorized");
        throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }
}

export const assertCanWriteDocument = async (profileId: string, documentId: string) => {
    const document = await Document.findById(documentId);
    if(!document) {
        console.log("Document not found");
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const collaborator = await Collaborator.findOne({documentId, profileId});
    if(document.ownerId.toString() !== profileId && collaborator?.role !== "editor") {
        console.log("Unauthorized");
        throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }
}

export const fetchEnrichedCollaborators = async (documentId: string) => {
    const document = await Document.findById(documentId);
    if(!document) {
        console.log("Document not found");
        throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    const collaborators = await Collaborator.find({documentId});
    const collIds = collaborators.map(coll => coll.profileId.toString());
    const profiles = await Profile.find({_id: {$in: [...collIds, document.ownerId]}}).lean();
    const owner = profiles.find((profile: ProfileType) => profile._id.equals(document.ownerId));
    const mapped = collaborators.map(coll => {
        const profile = profiles.find((profile: ProfileType) => profile._id.equals(coll.profileId));
        if(!profile) return null;
        return {
            _id: coll._id.toString(),
            name: `${profile.firstName} ${profile.lastName}`.trim(),
            permissions: coll.role === "editor" ? ["read", "write"] : ["read"],
        }
    }).filter(Boolean);
    if(owner) {
        mapped.push({
            _id: owner._id.toString(),
            name: `${owner.firstName} ${owner.lastName}`.trim(),
            permissions: ["read", "write"],
        })
    }
    return mapped;
}