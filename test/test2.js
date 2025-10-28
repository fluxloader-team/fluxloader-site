function getModifier(message = "") {
	var err = new Error(message);
	var stackLines = (err.stack || "").split("\n");
	var relevantLines = stackLines.filter(
		(line) =>
			line.includes("at ") &&
			!line.includes("at get") &&
			!line.includes("at Module._extensions") &&
			!line.includes("at getStackDetailed") &&
			!line.includes("at Proxy.set") &&
			!line.includes("at set ") &&
			!line.includes("at Object.defineProperty") &&
			!line.includes("at Function.defineProperty") &&
			!line.includes("at instrumentGlobalProperty") &&
			!line.includes("at Module") &&
			!line.includes("Function.executeUserEntryPoint") &&
			!line.includes("at node") &&
			!line.includes("at Module._compile"),
	);
	var NameWithbcodeline = relevantLines[0].split("\\")[relevantLines[0].split("\\").length - 1];
	var Name = NameWithbcodeline.split(":")[0];
	return Name || "Unknown";
}

var originalDefineProperty = Object.defineProperty;
var instrumentedProperties = new Set();
globalThis.internalTracker = {
	setValues: { by: "value" },
};
function instrumentGlobalProperty(target, prop, initialValue, originalDescriptor = {}) {
	var instrumentedFlag = Symbol.for(`__instrumented_${String(prop)}__`);
	if (Object.prototype.hasOwnProperty.call(target, instrumentedFlag)) {
		console.log(`Skipping already instrumented property: ${String(prop)}`);
		return true;
	}

	try {
		var currentValue = initialValue;

		var newDescriptor = {
			configurable: true,
			enumerable: !!originalDescriptor.enumerable,

			get() {
				console.log(`globalThis Property set by: ${getModifier()} ${prop}`);
				//globalThis.internalTracker.setValues[]
				return currentValue;
			},
			set(newValue) {
				var oldValue = currentValue;
				var hasOwn = Object.prototype.hasOwnProperty.call(target, prop);
				var stack = getModifier(`Setting ${String(prop)}`);
				var action = hasOwn ? "Modified" : "Added/Set";
				console.log(`--- Global Assignment Detected (Setter) ---`);
				console.log(`  Property: ${String(prop)}`);
				if (action === "Modified") {
					console.log(`  Old Value:`, oldValue);
				}
				console.log(`  New Value:`, newValue);
				console.log(`  Action: ${action}`);
				console.log(`  Origin:\n      ${stack}`);
				console.log(`-------------------------------------------`);
				currentValue = newValue;
			},
		};
		originalDefineProperty(target, prop, newDescriptor);

		originalDefineProperty(target, instrumentedFlag, {
			value: true,
			writable: false,
			enumerable: false,
			configurable: false,
		});
		instrumentedProperties.add(prop);

		console.log(`Successfully instrumented ${String(prop)}`);
		return true;
	} catch (error) {
		console.warn(`[ERROR] Failed to instrument global property "${String(prop)}": ${error.message}. Origin Desc:`, originalDescriptor);
		return false;
	}
}

Object.defineProperty = function (obj, prop, descriptor) {
	if (obj === globalThis) {
		var stack = getModifier(`Defining ${String(prop)}`);
		console.log(`--- Global DefineProperty Intercepted ---`);
		console.log(`  Property: ${String(prop)}`);
		console.log(`  Descriptor:`, descriptor);
		console.log(`  Origin:\n      ${stack}`);
		console.log(`-----------------------------------------`);
		if (descriptor && "value" in descriptor && descriptor.writable && descriptor.configurable !== false) {
			console.log(`Attempting to instrument ${String(prop)} via defineProperty wrapper...`);
			var instrumented = instrumentGlobalProperty(obj, prop, descriptor.value, descriptor);
			if (instrumented) {
				return obj;
			} else {
				console.warn(`Instrumentation failed for ${String(prop)}, applying original descriptor.`);
				return originalDefineProperty(obj, prop, descriptor);
			}
		} else {
			console.log(`Applying original/non-instrumentable descriptor for ${String(prop)}.`);
			return originalDefineProperty(obj, prop, descriptor);
		}
	} else {
		return originalDefineProperty(obj, prop, descriptor);
	}
};
console.log("--- Object.defineProperty monkey-patched ---");

console.log("--- Instrumenting EXISTING global properties ---");
var initialGlobalProps = Object.getOwnPropertyNames(globalThis);
var existingInstrumentedCount = 0;

var skipProps = new Set([
	"Object",
	"Array",
	"String",
	"Number",
	"Boolean",
	"Symbol",
	"Error",
	"Proxy",
	"Reflect",
	"Promise",
	"Date",
	"RegExp",
	"Buffer",
	"require",
	"module",
	"exports",
	"__filename",
	"__dirname",
	"console",
	"queueMicrotask",
	"WebAssembly",
	"URL",
	"URLSearchParams",
	"TextEncoder",
	"TextDecoder",
	"SharedArrayBuffer",
	"FinalizationRegistry",
	"WeakRef",
	"WeakMap",
	"WeakSet",
	"JSON",
	"Math",
	"Intl",
	"Map",
	"Set",
	"BigInt",
	"structuredClone",
	"ArrayBuffer",
	"DataView",
	"Int8Array",
	"Uint8Array",
	"Uint8ClampedArray",
	"Int16Array",
	"Uint16Array",
	"Int32Array",
	"Uint32Array",
	"Float32Array",
	"Float64Array",
	"BigInt64Array",
	"BigUint64Array",
	"escape",
	"unescape",
	"performance",
]);

initialGlobalProps.forEach((prop) => {
	if (skipProps.has(prop)) {
		console.log(`Skipping instrumentation of essential/problematic property: ${prop}`);
		return;
	}
	var instrumentedFlag = Symbol.for(`__instrumented_${String(prop)}__`);
	if (Object.prototype.hasOwnProperty.call(globalThis, instrumentedFlag)) {
		return;
	}

	try {
		var descriptor = Object.getOwnPropertyDescriptor(globalThis, prop);

		if (descriptor && "value" in descriptor && descriptor.configurable) {
			if (instrumentGlobalProperty(globalThis, prop, descriptor.value, descriptor)) {
				existingInstrumentedCount++;
			}
		} else {
			if (descriptor && !descriptor.configurable) console.log(`Skipping non-configurable: ${prop}`);
			if (descriptor && ("get" in descriptor || "set" in descriptor)) console.log(`Skipping existing accessor: ${prop}`);
		}
	} catch (e) {
		console.warn(`[ERROR] Exception during initial instrumentation of ${prop}: ${e.message}`);
	}
});
console.log(`--- Initial instrumentation complete. Instrumented ${existingInstrumentedCount} existing properties. ---`);
