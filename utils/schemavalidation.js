const semver = require("semver");

class SchemaValidation {
	// Errors if the schema is invalid
	// Return true / false if the target is valid

	static FLOAT_EPSILON = 1e-8;

	static validate(target, schema, config = {}) {
		// Recursively validates the target object against the schema object
		if (typeof schema !== "object") {
			return { success: false, error: "Schema must be an object", source: "schema" };
		}
		if (typeof target !== "object") {
			return { success: false, error: "Target must be an object", source: "target" };
		}

		// Ensure every key in target is also in the schema
		for (const configKey of Object.keys(target)) {
			if (schema[configKey] === undefined) {
				if (!config.unknownKeyMethod || config.unknownKeyMethod === "ignore") {
					log("warn", "", `Target warning: Key '${configKey}' is not in the schema, ignoring...`);
				} else if (config.unknownKeyMethod === "delete") {
					log("warn", "", `Target warning: Key '${configKey}' is not in the schema, deleting...`);
					delete target[configKey];
				} else if (config.unknownKeyMethod === "error") {
					return { success: false, error: `Key '${configKey}' is not in the schema`, source: "target" };
				}
			}
		}

		for (const [schemaKey, schemaValue] of Object.entries(schema)) {
			// The schema value must be an object
			if (typeof schemaValue !== "object") {
				// throw new Error(`Schema invalid: Key '${schemaKey}' is not an object`);
				return { success: false, error: `Key '${schemaKey}' is not an object`, source: "schema" };
			}

			// Validate the target value against the schema leaf node
			const res = this.isSchemaLeafNode(schemaValue);
			if (!res.success) return res;
			if (res.isLeaf) {
				if (!Object.hasOwn(target, schemaKey)) {
					if (!Object.hasOwn(schemaValue, "default")) {
						return { success: false, error: `Key '${schemaKey}' is required by the schema`, source: "target" };
					}
					target[schemaKey] = schemaValue.default;
				}
				const res = this.validateValue(target[schemaKey], schemaValue);
				if (!res.success) return { success: false, error: `Key '${schemaKey}' is invalid, ${res.error}`, source: res.source };
			}

			// Otherwise recurse into the target and schema object
			else {
				if (!Object.hasOwn(target, schemaKey)) target[schemaKey] = {};
				const res = this.validate(target[schemaKey], schemaValue);
				if (!res.success) return res;
			}
		}

		return { success: true };
	}

	static validateValue(targetValue, schemaLeafValue) {
		switch (schemaLeafValue.type) {
			case "boolean":
				var isValid = typeof targetValue === "boolean";
				if (!isValid) return { success: false, error: `Expected boolean but got ${typeof targetValue}`, source: "target" };
				return { success: true };

			case "string":
				if (typeof targetValue !== "string") return { success: false, error: `Expected string but got ${typeof targetValue}`, source: "target" };
				if (Object.hasOwn(schemaLeafValue, "pattern")) {
					var regex = new RegExp(schemaLeafValue.pattern);
					if (!regex.test(targetValue)) return { success: false, error: `String '${targetValue}' does not match pattern '${schemaLeafValue.pattern}'`, source: "target" };
				}
				return { success: true };

			case "semver":
				if (typeof targetValue !== "string") return { success: false, error: `Expected semver string but got ${typeof targetValue}`, source: "target" };
				if (semver.coerce(targetValue) === null) return { success: false, error: `String is not a valid semver version`, source: "target" };
				return { success: true };

			case "number":
				if (typeof targetValue !== "number") return { success: false, error: `Expected number but got ${typeof targetValue}`, source: "target" };
				if (Object.hasOwn(schemaLeafValue, "min") && targetValue < schemaLeafValue.min) return { success: false, error: `Number is less than minimum value ${schemaLeafValue.min}`, source: "target" };
				if (Object.hasOwn(schemaLeafValue, "max") && targetValue > schemaLeafValue.max) return { success: false, error: `Number is greater than maximum value ${schemaLeafValue.max}`, source: "target" };
				// If step is given, checks if the value is close enough to the step value
				if (Object.hasOwn(schemaLeafValue, "step")) {
					if (Math.abs(targetValue / schemaLeafValue.step - Math.round(targetValue / schemaLeafValue.step)) > SchemaValidation.FLOAT_EPSILON) {
						return { success: false, error: `Number is not a valid step of ${schemaLeafValue.step}`, source: "target" };
					}
				}
				return { success: true };

			case "dropdown":
				if (!schemaLeafValue.options) return { success: false, error: `Dropdown schema must have 'options' defined`, source: "schema" };
				if (!schemaLeafValue.options.includes(targetValue)) return { success: false, error: `Value '${targetValue}' is not a valid option for dropdown`, source: "target" };
				return { success: true };

			case "object":
				if (typeof targetValue !== "object") return { success: false, error: `Expected object but got ${typeof targetValue}`, source: "target" };
				if (targetValue === null) return { success: false, error: `Expected object but got null`, source: "target" };
				if (Array.isArray(targetValue)) return { success: false, error: `Expected object but got an array`, source: "target" };
				return { success: true };

			case "array":
				if (!Array.isArray(targetValue)) return { success: false, error: `Expected array but got ${typeof targetValue}`, source: "target" };
				return { success: true };

			default:
				return { success: false, error: `Unknown schema type '${schemaLeafValue.type}'`, source: "schema" };
		}
	}

	static isSchemaLeafNode(schemaValue) {
		// This should be caught in the validate function but just in case we check here too
		if (typeof schemaValue !== "object") return { success: false, error: `Schema value must be an object`, source: "schema" };

		// If the schema value has "type" defined it is a leaf node
		const hasType = Object.hasOwn(schemaValue, "type");
		if (hasType) return { success: true, isLeaf: true };

		// If it does not have "type" defined it must only contain other objects or be empty
		const anyValuesNotObjects = Object.values(schemaValue).some((value) => typeof value !== "object");
		if (anyValuesNotObjects) return { success: false, error: `Schema node properties must either be a leaf node (include type) or only contain other objects`, source: "schema" };
		return { success: true, isLeaf: false };
	}
}

module.exports = SchemaValidation;