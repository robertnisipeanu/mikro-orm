"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const entity_1 = require("../entity");
class MetadataValidator {
    validateEntityDefinition(metadata, name) {
        const meta = metadata.get(name);
        // entities have PK
        if (!meta.primaryKey) {
            throw utils_1.ValidationError.fromMissingPrimaryKey(meta);
        }
        this.validateVersionField(meta);
        const references = Object.values(meta.properties).filter(prop => prop.reference !== entity_1.ReferenceType.SCALAR);
        for (const prop of references) {
            this.validateReference(meta, prop, metadata);
            if (prop.reference === entity_1.ReferenceType.ONE_TO_ONE) {
                this.validateBidirectional(meta, prop, metadata);
            }
            else if (prop.reference === entity_1.ReferenceType.ONE_TO_MANY) {
                const owner = metadata.get(prop.type).properties[prop.mappedBy];
                this.validateOneToManyInverseSide(meta, prop, owner);
            }
            else if (![entity_1.ReferenceType.MANY_TO_ONE, entity_1.ReferenceType.ONE_TO_ONE].includes(prop.reference)) {
                this.validateBidirectional(meta, prop, metadata);
            }
        }
    }
    validateDiscovered(discovered, warnWhenNoEntities) {
        if (discovered.length === 0 && warnWhenNoEntities) {
            throw utils_1.ValidationError.noEntityDiscovered();
        }
        const duplicates = utils_1.Utils.findDuplicates(discovered.map(meta => meta.className));
        if (duplicates.length > 0) {
            throw utils_1.ValidationError.duplicateEntityDiscovered(duplicates);
        }
        // validate base entities
        discovered
            .filter(meta => meta.extends && !discovered.find(m => m.className === meta.extends))
            .forEach(meta => { throw utils_1.ValidationError.fromUnknownBaseEntity(meta); });
        // validate we found at least one entity (not just abstract/base entities)
        if (discovered.filter(meta => meta.name).length === 0 && warnWhenNoEntities) {
            throw utils_1.ValidationError.onlyAbstractEntitiesDiscovered();
        }
    }
    validateReference(meta, prop, metadata) {
        // references do have types
        if (!prop.type) {
            throw utils_1.ValidationError.fromWrongTypeDefinition(meta, prop);
        }
        // references do have type of known entity
        if (!metadata.get(prop.type, false, false)) {
            throw utils_1.ValidationError.fromWrongTypeDefinition(meta, prop);
        }
    }
    validateBidirectional(meta, prop, metadata) {
        if (prop.inversedBy) {
            const inverse = metadata.get(prop.type).properties[prop.inversedBy];
            this.validateOwningSide(meta, prop, inverse);
        }
        else if (prop.mappedBy) {
            const inverse = metadata.get(prop.type).properties[prop.mappedBy];
            this.validateInverseSide(meta, prop, inverse);
        }
    }
    validateOneToManyInverseSide(meta, prop, owner) {
        // 1:m collection has existing `mappedBy` reference
        if (!owner) {
            throw utils_1.ValidationError.fromWrongReference(meta, prop, 'mappedBy');
        }
        // 1:m collection has correct `mappedBy` reference type
        if (owner.type !== meta.name) {
            throw utils_1.ValidationError.fromWrongReference(meta, prop, 'mappedBy', owner);
        }
    }
    validateOwningSide(meta, prop, inverse) {
        // has correct `inversedBy` on owning side
        if (!inverse) {
            throw utils_1.ValidationError.fromWrongReference(meta, prop, 'inversedBy');
        }
        // has correct `inversedBy` reference type
        if (inverse.type !== meta.name) {
            throw utils_1.ValidationError.fromWrongReference(meta, prop, 'inversedBy', inverse);
        }
        // inversed side is not defined as owner
        if (inverse.inversedBy) {
            throw utils_1.ValidationError.fromWrongOwnership(meta, prop, 'inversedBy');
        }
    }
    validateInverseSide(meta, prop, owner) {
        // has correct `mappedBy` on inverse side
        if (prop.mappedBy && !owner) {
            throw utils_1.ValidationError.fromWrongReference(meta, prop, 'mappedBy');
        }
        // has correct `mappedBy` reference type
        if (owner.type !== meta.name) {
            throw utils_1.ValidationError.fromWrongReference(meta, prop, 'mappedBy', owner);
        }
        // owning side is not defined as inverse
        if (owner.mappedBy) {
            throw utils_1.ValidationError.fromWrongOwnership(meta, prop, 'mappedBy');
        }
    }
    validateVersionField(meta) {
        if (!meta.versionProperty) {
            return;
        }
        const props = Object.values(meta.properties).filter(p => p.version);
        if (props.length > 1) {
            throw utils_1.ValidationError.multipleVersionFields(meta, props.map(p => p.name));
        }
        const prop = meta.properties[meta.versionProperty];
        const type = prop.type.toLowerCase();
        if (type !== 'number' && type !== 'date' && !type.startsWith('timestamp') && !type.startsWith('datetime')) {
            throw utils_1.ValidationError.invalidVersionFieldType(meta);
        }
    }
}
exports.MetadataValidator = MetadataValidator;