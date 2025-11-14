(function ($) {
    Drupal.behaviors.be1 = {
        attach: function (context, settings) {
            // Scrie doar numere
            jQuery("table").on(
                "keypress",
                "input.float, input.numeric",
                function (event) {
                    if (isNumberPressed(this, event) === false) {
                        event.preventDefault();
                    }
                }
            );
        },
    };

    function col(n) {
        return n < 10 ? "0" + n : "" + n;
    }

    function toNum(v) {
        if (v == null || v === "") return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    }

    function isBlank(v) {
        return (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "")
        );
    }

    function isNumeric(v) {
        if (isBlank(v)) return false;
        return /^-?\d+(\.\d+)?$/.test(String(v).trim());
    }
    function decOrNull(v) {
        return isNumeric(v) ? new Decimal(String(v).trim()) : null;
    }
    function bothZero(a, b) {
        return a && b && a.isZero() && b.isZero();
    }

    function asDecOrNull(v) {
        return hasNumeric(v) ? new Decimal(String(v).trim()) : null;
    }
    function fmt(v) {
        return hasNumeric(v) ? String(v).trim() : "necompletat";
    }

    webform.afterLoad.edu1 = function () { };

    webform.validators.edu1 = function () {
        var values = Drupal.settings.mywebform.values;
        var errors = webform.errors;
        // helper: ia valorile (cu Decimal) și verifică dacă toate sunt egale
        function checkAllEqual(fieldNames, code, messagePrefix) {
            // prima valoare de referință
            var base = new Decimal(values[fieldNames[0]] || 0);
            for (var i = 1; i < fieldNames.length; i++) {
                var cur = new Decimal(values[fieldNames[i]] || 0);
                if (!cur.equals(base)) {
                    webform.errors.push({
                        fieldName: fieldNames[i],
                        msg: Drupal.t(
                            messagePrefix +
                            ". Toate aceste cîmpuri trebuie să fie egale. Valori: " +
                            fieldNames
                                .map(function (f) {
                                    return f + "=" + (values[f] || 0);
                                })
                                .join(", ")
                        ),
                    });
                    return;
                }
            }
        }

        // 1) Cap.1 Rind.19 Col.14 = Cap.3 Rind.01 Col.1
        (function () {
            var f1 = "CAP1_R19_C14";
            var f2 = "CAP3_R1_C01";

            // luăm valorile ca string și le curățăm
            var raw1 = (values[f1] || "").toString().trim();
            var raw2 = (values[f2] || "").toString().trim();

            // dacă e gol -> 0
            var v1 = raw1 === "" ? new Decimal(0) : new Decimal(raw1);
            var v2 = raw2 === "" ? new Decimal(0) : new Decimal(raw2);

            // IMPORTANT: la Decimal.js e .eq(), nu .equals()
            if (!v1.eq(v2)) {
                webform.errors.push({
                    fieldName: f1,
                    msg: Drupal.t(
                        "[EDU-001]. Cap.1 rînd.19 col.14 trebuie să fie egal cu Cap.3 rînd.01 col.1. Valori: (" +
                        v1.toString() +
                        " ≠ " +
                        v2.toString() +
                        ")"
                    ),
                });
            }
        })();

        // 2) Cap.1 Rind.1...21 Col.1...14 >=  Cap.2 Rind.1...21 Col.1...14
        (function () {
            for (var r = 1; r <= 21; r++) {
                for (var c = 1; c <= 14; c++) {
                    var cap1Key = "CAP1_R" + r + "_C" + col(c);
                    var cap2Key = "CAP2_R" + r + "_C" + col(c);
                    var v1 = new Decimal(values[cap1Key] || 0);
                    var v2 = new Decimal(values[cap2Key] || 0);
                    if (v1.lessThan(v2)) {
                        webform.errors.push({
                            fieldName: cap1Key,
                            msg: Drupal.t(
                                "[EDU-002]. Cap.1 rînd." +
                                r +
                                " col." +
                                c +
                                " trebuie să fie ≥ Cap.2 rînd." +
                                r +
                                " col." +
                                c +
                                ". Valori: (" +
                                v1 +
                                " < " +
                                v2 +
                                ")"
                            ),
                        });
                    }
                }
            }
        })();

        // stânga: CAP1_R19_C01 + C03 + C04 + C05
        const leftSum =
            toNum(document.getElementById("CAP1_R19_C01")?.value) +
            toNum(document.getElementById("CAP1_R19_C03")?.value) +
            toNum(document.getElementById("CAP1_R19_C04")?.value) +
            toNum(document.getElementById("CAP1_R19_C05")?.value);

        // dreapta: CAP3_R3_C01 + R7_C01 + R11_C01
        const rightSum =
            toNum(document.getElementById("CAP3_R3_C01")?.value) +
            toNum(document.getElementById("CAP3_R7_C01")?.value) +
            toNum(document.getElementById("CAP3_R11_C01")?.value);

        if (leftSum !== rightSum) {
            errors.push({
                fieldName: "CAP1_R19_C01", // sau oricare din câmpurile implicate
                msg: `Cap.1 rînd 19 (col.1+3+4+5 = ${leftSum}) trebuie să fie egal cu Cap.3 (rînd. 03+07+11 col.1 = ${rightSum}).`,
            });
        }

        // [EDU-002] Cap.1 Rind.19 Col.6-10 = Cap.3 Rind.04, 08, 12 Col.1
        (function () {
            const f1 = [
                "CAP1_R19_C06",
                "CAP1_R19_C07",
                "CAP1_R19_C08",
                "CAP1_R19_C09",
                "CAP1_R19_C10",
            ];
            const f2 = ["CAP3_R4_C01", "CAP3_R8_C01", "CAP3_R12_C01"];

            // sumă partea stângă (Cap.1)
            let sumLeft = new Decimal(0);
            f1.forEach((field) => {
                const val = values[field];
                if (val !== undefined && val !== null && val !== "")
                    sumLeft = sumLeft.plus(new Decimal(val));
            });

            // sumă partea dreaptă (Cap.3)
            let sumRight = new Decimal(0);
            f2.forEach((field) => {
                const val = values[field];
                if (val !== undefined && val !== null && val !== "")
                    sumRight = sumRight.plus(new Decimal(val));
            });

            // comparăm sumele
            if (!sumLeft.eq(sumRight)) {
                webform.errors.push({
                    fieldName: "CAP1_R19_C06", // sau oricare din col.6–10
                    msg: Drupal.t(
                        "[EDU-002]. Cap.1 rînd.19 (col.6–10 = " +
                        sumLeft.toString() +
                        ") trebuie să fie egal cu Cap.3 (rînd.04, 08, 12 col.1 = " +
                        sumRight.toString() +
                        ")."
                    ),
                });
            }
        })();

        // [EDU-003] Cap.1 Rind.19 Col.11-13 = Cap.3 Rind.05, 09, 13 Col.1
        (function () {
            const leftFields = ["CAP1_R19_C11", "CAP1_R19_C12", "CAP1_R19_C13"];
            const rightFields = ["CAP3_R5_C01", "CAP3_R9_C01", "CAP3_R13_C01"];

            let sumLeft = new Decimal(0);
            leftFields.forEach((f) => {
                const v = values[f];
                if (v !== undefined && v !== null && v !== "")
                    sumLeft = sumLeft.plus(new Decimal(v));
            });

            let sumRight = new Decimal(0);
            rightFields.forEach((f) => {
                const v = values[f];
                if (v !== undefined && v !== null && v !== "")
                    sumRight = sumRight.plus(new Decimal(v));
            });

            if (!sumLeft.eq(sumRight)) {
                webform.errors.push({
                    fieldName: "CAP1_R19_C11", // una din celulele din stânga
                    msg: Drupal.t(
                        "[EDU-003]. Cap.1 rînd.19 (col.11–13 = " +
                        sumLeft.toString() +
                        ") trebuie să fie egal cu Cap.3 (rînd.05, 09, 13 col.1 = " +
                        sumRight.toString() +
                        ")."
                    ),
                });
            }
        })();

        (function () {
            const pairs = [
                // [EDU-004] CAP1 ≥ CAP4
                { f1: "CAP1_R19_C01", f2: "CAP4_R1_C01", op: ">=", code: "EDU-004" },
                { f1: "CAP1_R19_C03", f2: "CAP4_R2_C01", op: ">=", code: "EDU-005" },
                { f1: "CAP1_R19_C04", f2: "CAP4_R3_C01", op: "=", code: "EDU-006" },
                { f1: "CAP1_R19_C05", f2: "CAP4_R4_C01", op: "=", code: "EDU-007" },
                { f1: "CAP1_R19_C06", f2: "CAP4_R5_C01", op: "=", code: "EDU-008" },
                { f1: "CAP1_R19_C07", f2: "CAP4_R6_C01", op: "=", code: "EDU-009" },
                { f1: "CAP1_R19_C08", f2: "CAP4_R7_C01", op: "=", code: "EDU-010" },
                { f1: "CAP1_R19_C09", f2: "CAP4_R8_C01", op: "=", code: "EDU-011" },
                { f1: "CAP1_R19_C10", f2: "CAP4_R9_C01", op: "=", code: "EDU-012" },
                { f1: "CAP1_R19_C11", f2: "CAP4_R10_C01", op: "=", code: "EDU-013" },
                { f1: "CAP1_R19_C12", f2: "CAP4_R11_C01", op: "=", code: "EDU-014" },
                { f1: "CAP1_R19_C13", f2: "CAP4_R12_C01", op: "=", code: "EDU-015" },
                { f1: "CAP1_R19_C14", f2: "CAP4_R13_C01", op: ">=", code: "EDU-016" },
                // + CAP7 suplimentare
                { f1: "CAP1_R19_C14", f2: "CAP7_R1_C02", op: ">=", code: "EDU-017" },
                { f1: "CAP1_R22_C14", f2: "CAP7_R1_C01", op: ">=", code: "EDU-018" },
            ];

            pairs.forEach(({ f1, f2, op, code }) => {
                const v1 = new Decimal(values[f1] || 0);
                const v2 = new Decimal(values[f2] || 0);
                let condition = false;

                switch (op) {
                    case "=":
                        condition = !v1.eq(v2);
                        break;
                    case ">=":
                        condition = v1.lt(v2);
                        break;
                }

                if (condition) {
                    const symbol = op === "=" ? "egal" : "mai mare sau egal";
                    webform.errors.push({
                        fieldName: f1,
                        msg: Drupal.t(
                            `[${code}]. Cap.1 (${f1.replace(
                                /_/g,
                                "."
                            )}) trebuie să fie ${symbol} cu ${f2.replace(
                                /_/g,
                                "."
                            )}. Valori: (${v1.toString()} vs ${v2.toString()})`
                        ),
                    });
                }
            });
        })();

        // [EDU-019] Cap.1 Rind.19 Col.11-13 >= Cap.8 Rind.01 Col.1
        (function () {
            const leftFields = ["CAP1_R19_C11", "CAP1_R19_C12", "CAP1_R19_C13"];
            const rightField = "CAP8_R1_C01";

            // Suma pe partea stângă
            let sumLeft = new Decimal(0);
            leftFields.forEach((f) => {
                const v = values[f];
                if (v !== undefined && v !== null && v !== "")
                    sumLeft = sumLeft.plus(new Decimal(v));
            });

            // Valoarea de pe partea dreaptă
            const vRight = new Decimal(values[rightField] || 0);

            // Verificăm condiția ≥
            if (sumLeft.lt(vRight)) {
                webform.errors.push({
                    fieldName: leftFields[0],
                    msg: Drupal.t(
                        "[EDU-019]. Cap.1 rînd.19 (col.11–13 = " +
                        sumLeft.toString() +
                        ") trebuie să fie mai mare sau egal cu Cap.8 rînd.01 col.1 (" +
                        vRight.toString() +
                        ")."
                    ),
                });
            }
        })();

        (function () {
            const pairs = [
                { f1: "CAP1_R19_C11", f2: "CAP8_R1_C02", code: "EDU-020" },
                { f1: "CAP1_R19_C12", f2: "CAP8_R1_C03", code: "EDU-021" },
                { f1: "CAP1_R19_C13", f2: "CAP8_R1_C04", code: "EDU-022" },
            ];

            pairs.forEach(({ f1, f2, code }) => {
                const v1 = new Decimal(values[f1] || 0);
                const v2 = new Decimal(values[f2] || 0);

                // validare ≥
                if (v1.lt(v2)) {
                    webform.errors.push({
                        fieldName: f1,
                        msg: Drupal.t(
                            `[${code}]. Cap.1 (${f1.replace(
                                /_/g,
                                "."
                            )}) trebuie să fie mai mare sau egal cu ${f2.replace(
                                /_/g,
                                "."
                            )}. Valori: (${v1.toString()} vs ${v2.toString()})`
                        ),
                    });
                }
            });
        })();

        // [EDU-023] Cap.1 Rind.19 Col.1,3–5 >= Cap.9 Rind.01 Col.2
        (function () {
            const leftFields = [
                "CAP1_R19_C01",
                "CAP1_R19_C03",
                "CAP1_R19_C04",
                "CAP1_R19_C05",
            ];
            const rightField = "CAP9_R1_C02";

            // calculăm suma din stânga
            let sumLeft = new Decimal(0);
            leftFields.forEach((f) => {
                const v = values[f];
                if (v !== undefined && v !== null && v !== "")
                    sumLeft = sumLeft.plus(new Decimal(v));
            });

            // valoarea din dreapta
            const vRight = new Decimal(values[rightField] || 0);

            // verificăm condiția ≥
            if (sumLeft.lt(vRight)) {
                webform.errors.push({
                    fieldName: leftFields[0],
                    msg: Drupal.t(
                        "[EDU-023]. Cap.1 rînd.19 (col.1,3–5 = " +
                        sumLeft.toString() +
                        ") trebuie să fie mai mare sau egal cu Cap.9 rînd.01 col.2 (" +
                        vRight.toString() +
                        ")."
                    ),
                });
            }
        })();

        (function () {
            const checks = [
                { f1: "CAP3_R1_C01", f2: "CAP7_R1_C02", op: "=", code: "EDU-024" },
                { f1: "CAP1_R19_C14", f2: "CAP12_R1_C02", op: ">", code: "EDU-025" },
            ];

            checks.forEach(({ f1, f2, op, code }) => {
                const v1 = new Decimal(values[f1] || 0);
                const v2 = new Decimal(values[f2] || 0);
                let invalid = false;

                switch (op) {
                    case "=":
                        invalid = !v1.eq(v2);
                        break;
                    case ">":
                        invalid = !v1.gt(v2);
                        break;
                }

                if (invalid) {
                    const text = op === "=" ? "egal cu" : "mai mare decât";

                    webform.errors.push({
                        fieldName: f1,
                        msg: Drupal.t(
                            `[${code}]. ${f1.replace(
                                /_/g,
                                "."
                            )} trebuie să fie ${text} ${f2.replace(
                                /_/g,
                                "."
                            )}. Valori: (${v1.toString()} vs ${v2.toString()})`
                        ),
                    });
                }
            });
        })();

        (function () {
            // --- [EDU-026] Cap.7 Col.1 = Col.3 + Col.5
            (function () {
                const c1 = new Decimal(values["CAP7_R1_C01"] || 0);
                const c3 = new Decimal(values["CAP7_R1_C03"] || 0);
                const c5 = new Decimal(values["CAP7_R1_C05"] || 0);
                const sum = c3.plus(c5);

                if (!c1.eq(sum)) {
                    webform.errors.push({
                        fieldName: "CAP7_R1_C01",
                        msg: Drupal.t(
                            `[EDU-026]. Cap.7 rînd.01 col.1 (${c1}) trebuie să fie egal cu suma col.3 + col.5 (${sum}).`
                        ),
                    });
                }
            })();

            // --- [EDU-027] Cap.7 Col.2 = Col.4 + Col.6
            (function () {
                const c2 = new Decimal(values["CAP7_R1_C02"] || 0);
                const c4 = new Decimal(values["CAP7_R1_C04"] || 0);
                const c6 = new Decimal(values["CAP7_R1_C06"] || 0);
                const sum = c4.plus(c6);

                if (!c2.eq(sum)) {
                    webform.errors.push({
                        fieldName: "CAP7_R1_C02",
                        msg: Drupal.t(
                            `[EDU-027]. Cap.7 rînd.01 col.2 (${c2}) trebuie să fie egal cu suma col.4 + col.6 (${sum}).`
                        ),
                    });
                }
            })();

            // --- [EDU-028] Dacă (r1,c1) ≠ 0 ↔ (r1,c2) ≠ 0
            (function () {
                const c1 = new Decimal(values["CAP7_R1_C01"] || 0);
                const c2 = new Decimal(values["CAP7_R1_C02"] || 0);

                const oneZeroOtherNonZero =
                    (c1.eq(0) && !c2.eq(0)) || (!c1.eq(0) && c2.eq(0));

                if (oneZeroOtherNonZero) {
                    webform.errors.push({
                        fieldName: "CAP7_R1_C01",
                        msg: Drupal.t(
                            `[EDU-028]. Dacă Cap.7 rînd.01 col.1 ≠ 0, atunci col.2 trebuie să fie ≠ 0 și invers. Valori: (${c1} vs ${c2}).`
                        ),
                    });
                }
            })();

            // --- [EDU-029] Dacă (r1,c3) ≠ 0 ↔ (r1,c4) ≠ 0
            (function () {
                const c3 = new Decimal(values["CAP7_R1_C03"] || 0);
                const c4 = new Decimal(values["CAP7_R1_C04"] || 0);

                const mismatch = (c3.eq(0) && !c4.eq(0)) || (!c3.eq(0) && c4.eq(0));

                if (mismatch) {
                    webform.errors.push({
                        fieldName: "CAP7_R1_C03",
                        msg: Drupal.t(
                            `[EDU-029]. Dacă Cap.7 rînd.01 col.3 ≠ 0, atunci col.4 trebuie să fie ≠ 0 și invers. Valori: (${c3} vs ${c4}).`
                        ),
                    });
                }
            })();

            // --- [EDU-030] Dacă (r1,c5) ≠ 0 ↔ (r1,c6) ≠ 0
            (function () {
                const c5 = new Decimal(values["CAP7_R1_C05"] || 0);
                const c6 = new Decimal(values["CAP7_R1_C06"] || 0);

                const mismatch = (c5.eq(0) && !c6.eq(0)) || (!c5.eq(0) && c6.eq(0));

                if (mismatch) {
                    webform.errors.push({
                        fieldName: "CAP7_R1_C05",
                        msg: Drupal.t(
                            `[EDU-030]. Dacă Cap.7 rînd.01 col.5 ≠ 0, atunci col.6 trebuie să fie ≠ 0 și invers. Valori: (${c5} vs ${c6}).`
                        ),
                    });
                }
            })();
        })();

        // [EDU-031] Cap.1 Rind.19 = sumă Cap.1 Rind.01–18 (pe toate coloanele)
        (function edu_031_cap1_r19_equals_sum() {
            const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
            const R_START = 1,
                R_END = 18,
                R_TOTAL = 19;

            COLS.forEach((c) => {
                const cc = String(c).padStart(2, "0");
                let sum = new Decimal(0);
                let anyPos = false;

                for (let r = R_START; r <= R_END; r++) {
                    const v = decOrNull(values[`CAP1_R${r}_C${cc}`]);
                    if (v) {
                        sum = sum.plus(v);
                        if (!v.isZero()) anyPos = true;
                    }
                }
                const v19 = decOrNull(values[`CAP1_R${R_TOTAL}_C${cc}`]);

                // nimic introdus (sum=0 și r19 gol/0) → ignorăm
                if (!anyPos && (v19 === null || v19.isZero())) return;
                if (v19 === null) return; // așteptăm totalul

                if (!v19.equals(sum)) {
                    webform.errors.push({
                        fieldName: `CAP1_R${R_TOTAL}_C${cc}`,
                        msg: Drupal.t(
                            `[EDU-031]. Cap.1 rînd.19 col.${c} (${v19}) trebuie să fie egal cu suma rîndurilor 01–18 din aceeași coloană (${sum}).`
                        ),
                    });
                }
            });
        })();

        (function () {
            // coloanele pe care le verificăm (fără col.2)
            const cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

            // --------------------------------------------------
            // [EDU-034] Rînd.20 + Rînd.21 ≤ Rînd.19 (pe col.1,3–14)
            // --------------------------------------------------
            cols.forEach((c) => {
                const col = c.toString().padStart(2, "0");

                const r19 = new Decimal(values[`CAP1_R19_C${col}`] || 0);
                const r20 = new Decimal(values[`CAP1_R20_C${col}`] || 0);
                const r21 = new Decimal(values[`CAP1_R21_C${col}`] || 0);

                const sum2021 = r20.plus(r21);

                if (sum2021.gt(r19)) {
                    webform.errors.push({
                        fieldName: `CAP1_R20_C${col}`,
                        msg: Drupal.t(
                            `[EDU-034]. Cap.1 (rînd.20 + rînd.21) col.${c} = ${sum2021.toString()} nu trebuie să depășească rînd.19 col.${c} = ${r19.toString()}.`
                        ),
                    });
                }
            });

            // EDU-035 — CAP1 R22 < R19 pe aceeași coloană (fără spam la 0 vs 0)
            (function edu_035_cap1_r22_lt_r19() {
                // conform erorilor: col. 1, 3–14 (nu verificăm col.2)
                const COLS = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
                const R_SUM = 19; // total elevi
                const R_CNT = 22; // numărul de clase

                COLS.forEach((c) => {
                    const cc = String(c).padStart(2, "0");
                    const v19 = decOrNull(values[`CAP1_R${R_SUM}_C${cc}`]); // total pe col.
                    const v22 = decOrNull(values[`CAP1_R${R_CNT}_C${cc}`]); // nr. de clase pe col.

                    // dacă ambele lipsă → nimic de verificat
                    if (v19 === null && v22 === null) return;
                    // dacă totalul (r19) lipsește → așteptăm să apară totalul
                    if (v19 === null) return;
                    // dacă r22 lipsă → nu semnalăm încă
                    if (v22 === null) return;

                    // dacă ambele sunt 0 → ignorăm (evităm “0 < 0”)
                    if (bothZero(v19, v22)) return;

                    // cazul special: r19 = 0 dar r22 > 0 (nu poate exista nr. clase când totalul e 0)
                    if (v19.isZero() && v22.gt(0)) {
                        webform.errors.push({
                            fieldName: `CAP1_R${R_CNT}_C${cc}`,
                            msg: Drupal.t(
                                `[EDU-035]. Cap.1 rînd.${R_CNT} col.${c} (${v22}) trebuie să fie mai mic decât rînd.${R_SUM} col.${c} (${v19}).`
                            ),
                        });
                        return;
                    }

                    // regulă generală: r22 trebuie să fie STRICT mai mic decât r19
                    if (v22.gte(v19)) {
                        webform.errors.push({
                            fieldName: `CAP1_R${R_CNT}_C${cc}`,
                            msg: Drupal.t(
                                `[EDU-035]. Cap.1 rînd.${R_CNT} col.${c} (${v22}) trebuie să fie mai mic decât rînd.${R_SUM} col.${c} (${v19}).`
                            ),
                        });
                    }
                });
            })();

            // --------------------------------------------------
            // [EDU-036] Col.14 = sumă col.1,3–13 pe rîndurile 01–22
            // pentru fiecare rînd separat
            // --------------------------------------------------
            // for (let r = 1; r <= 22; r++) {
            //   let sum = new Decimal(0);

            //   // col.1
            //   const c1 = values[`CAP1_R${r}_C01`];
            //   if (c1 !== undefined && c1 !== null && c1 !== "") {
            //     sum = sum.plus(new Decimal(c1));
            //   }

            //   // col.3–13
            //   for (let c = 3; c <= 13; c++) {
            //     const col = c.toString().padStart(2, "0");
            //     const v = values[`CAP1_R${r}_C${col}`];
            //     if (v !== undefined && v !== null && v !== "") {
            //       sum = sum.plus(new Decimal(v));
            //     }
            //   }

            //   const col14 = new Decimal(values[`CAP1_R${r}_C14`] || 0);

            //   if (!col14.eq(sum)) {
            //     webform.errors.push({
            //       fieldName: `CAP1_R${r}_C14`,
            //       msg: Drupal.t(
            //         `[EDU-036]. Cap.1 rînd.${r
            //           .toString()
            //           .padStart(
            //             2,
            //             "0"
            //           )} col.14 (${col14.toString()}) trebuie să fie egal cu suma col.1 și col.3–13 (${sum.toString()}).`
            //       ),
            //     });
            //   }
            // }
        })();

        (function () {
            // coloanele pe care le verificăm (fără col.2)
            const cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

            // --------------------------------------------------
            // [EDU-034] Rînd.20 + Rînd.21 ≤ Rînd.19 (pe col.1,3–14)
            // --------------------------------------------------
            cols.forEach((c) => {
                const col = c.toString().padStart(2, "0");

                const r19 = new Decimal(values[`CAP1_R19_C${col}`] || 0);
                const r20 = new Decimal(values[`CAP1_R20_C${col}`] || 0);
                const r21 = new Decimal(values[`CAP1_R21_C${col}`] || 0);

                const sum2021 = r20.plus(r21);

                if (sum2021.gt(r19)) {
                    webform.errors.push({
                        fieldName: `CAP1_R20_C${col}`,
                        msg: Drupal.t(
                            `[EDU-034]. Cap.1 (rînd.20 + rînd.21) col.${c} = ${sum2021.toString()} nu trebuie să depășească rînd.19 col.${c} = ${r19.toString()}.`
                        ),
                    });
                }
            });

            // --------------------------------------------------
            // [EDU-036] Col.14 = sumă col.1,3–13 pe rîndurile 01–22
            // pentru fiecare rînd separat
            // --------------------------------------------------
            // for (let r = 1; r <= 22; r++) {
            //   let sum = new Decimal(0);

            //   // col.1
            //   const c1 = values[`CAP1_R${r}_C01`];
            //   if (c1 !== undefined && c1 !== null && c1 !== "") {
            //     sum = sum.plus(new Decimal(c1));
            //   }

            //   // col.3–13
            //   for (let c = 3; c <= 13; c++) {
            //     const col = c.toString().padStart(2, "0");
            //     const v = values[`CAP1_R${r}_C${col}`];
            //     if (v !== undefined && v !== null && v !== "") {
            //       sum = sum.plus(new Decimal(v));
            //     }
            //   }

            //   const col14 = new Decimal(values[`CAP1_R${r}_C14`] || 0);

            //   if (!col14.eq(sum)) {
            //     webform.errors.push({
            //       fieldName: `CAP1_R${r}_C14`,
            //       msg: Drupal.t(
            //         `[EDU-036]. Cap.1 rînd.${r
            //           .toString()
            //           .padStart(
            //             2,
            //             "0"
            //           )} col.14 (${col14.toString()}) trebuie să fie egal cu suma col.1 și col.3–13 (${sum.toString()}).`
            //       ),
            //     });
            //   }
            // }
        })();

        (function edu_036_cap1_row_totals() {
            const ROWS = Array.from({ length: 19 }, (_, i) => i + 1); // 1..19 (poți extinde la 01–18,14,15,19 etc.)
            ROWS.forEach((r) => {
                const c14 = decOrNull(values[`CAP1_R${r}_C14`]);
                const colsToSum = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
                let sum = new Decimal(0),
                    anyPos = false;

                colsToSum.forEach((c) => {
                    const v = decOrNull(
                        values[`CAP1_R${r}_C${String(c).padStart(2, "0")}`]
                    );
                    if (v) {
                        sum = sum.plus(v);
                        if (!v.isZero()) anyPos = true;
                    }
                });

                // toate contribuțiile 0/gole și C14 gol/0 → ignorăm
                if (!anyPos && (c14 === null || c14.isZero())) return;
                if (c14 === null) return;

                if (!c14.equals(sum)) {
                    webform.errors.push({
                        fieldName: `CAP1_R${r}_C14`,
                        msg: Drupal.t(
                            `[EDU-036]. Cap.1 rînd.${String(r).padStart(
                                2,
                                "0"
                            )} col.14 (${c14}) trebuie să fie egal cu suma col.1 și col.3–13 (${sum}).`
                        ),
                    });
                }
            });
        })();

        (function () {
            // --------------------------------------------------
            // [EDU-101] Cap.2 rînd.19 = sumă rînd.01–18 pe toate coloanele (1–14)
            // --------------------------------------------------
            // for (let c = 1; c <= 14; c++) {
            //   const col = c.toString().padStart(2, "0");

            //   let sum = new Decimal(0);
            //   for (let r = 1; r <= 18; r++) {
            //     const f = `CAP2_R${r}_C${col}`;
            //     const v = values[f];
            //     if (v !== undefined && v !== null && v !== "") {
            //       sum = sum.plus(new Decimal(v));
            //     }
            //   }

            //   const totalField = `CAP2_R19_C${col}`;
            //   const totalVal = new Decimal(values[totalField] || 0);

            //   if (!totalVal.eq(sum)) {
            //     webform.errors.push({
            //       fieldName: totalField,
            //       msg: Drupal.t(
            //         `[EDU-101]. Cap.2 rînd.19 col.${c} (${totalVal.toString()}) trebuie să fie egal cu suma rîndurilor 01–18 din aceeași coloană (${sum.toString()}).`
            //       ),
            //     });
            //   }
            // }

            // coloanele pe care facem controalele 2–4 (fără col.2)
            const cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

            // --------------------------------------------------
            // [EDU-102] Cap.2 rînd.20 ≤ rînd.19 (pe col.1,3–14)
            // --------------------------------------------------
            cols.forEach((c) => {
                const col = c.toString().padStart(2, "0");
                const r19 = new Decimal(values[`CAP2_R19_C${col}`] || 0);
                const r20 = new Decimal(values[`CAP2_R20_C${col}`] || 0);

                if (r20.gt(r19)) {
                    webform.errors.push({
                        fieldName: `CAP2_R20_C${col}`,
                        msg: Drupal.t(
                            `[EDU-102]. Cap.2 rînd.20 col.${c} (${r20.toString()}) nu trebuie să depășească rînd.19 col.${c} (${r19.toString()}).`
                        ),
                    });
                }
            });

            // --------------------------------------------------
            // [EDU-103] Cap.2 rînd.21 ≤ rînd.19 (pe col.1,3–14)
            // --------------------------------------------------
            cols.forEach((c) => {
                const col = c.toString().padStart(2, "0");
                const r19 = new Decimal(values[`CAP2_R19_C${col}`] || 0);
                const r21 = new Decimal(values[`CAP2_R21_C${col}`] || 0);

                if (r21.gt(r19)) {
                    webform.errors.push({
                        fieldName: `CAP2_R21_C${col}`,
                        msg: Drupal.t(
                            `[EDU-103]. Cap.2 rînd.21 col.${c} (${r21.toString()}) nu trebuie să depășească rînd.19 col.${c} (${r19.toString()}).`
                        ),
                    });
                }
            });

            (function edu_101_cap2_r19_equals_sum() {
                const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
                const R_START = 1,
                    R_END = 18,
                    R_TOTAL = 19;

                COLS.forEach((c) => {
                    const cc = String(c).padStart(2, "0");
                    let sum = new Decimal(0),
                        anyPos = false;

                    for (let r = R_START; r <= R_END; r++) {
                        const v = decOrNull(values[`CAP2_R${r}_C${cc}`]);
                        if (v) {
                            sum = sum.plus(v);
                            if (!v.isZero()) anyPos = true;
                        }
                    }
                    const v19 = decOrNull(values[`CAP2_R${R_TOTAL}_C${cc}`]);

                    if (!anyPos && (v19 === null || v19.isZero())) return;
                    if (v19 === null) return;

                    if (!v19.equals(sum)) {
                        webform.errors.push({
                            fieldName: `CAP2_R${R_TOTAL}_C${cc}`,
                            msg: Drupal.t(
                                `[EDU-101]. Cap.2 rînd.19 col.${c} (${v19}) trebuie să fie egal cu suma rîndurilor 01–18 din aceeași coloană (${sum}).`
                            ),
                        });
                    }
                });
            })();

            // --------------------------------------------------
            // [EDU-104] Cap.2 (rînd.20 + rînd.21) ≤ rînd.19 (pe col.1,3–14)
            // --------------------------------------------------
            cols.forEach((c) => {
                const col = c.toString().padStart(2, "0");
                const r19 = new Decimal(values[`CAP2_R19_C${col}`] || 0);
                const r20 = new Decimal(values[`CAP2_R20_C${col}`] || 0);
                const r21 = new Decimal(values[`CAP2_R21_C${col}`] || 0);

                const sum2021 = r20.plus(r21);

                if (sum2021.gt(r19)) {
                    webform.errors.push({
                        fieldName: `CAP2_R20_C${col}`,
                        msg: Drupal.t(
                            `[EDU-104]. Cap.2 (rînd.20 + rînd.21) col.${c} = ${sum2021.toString()} nu trebuie să depășească rînd.19 col.${c} = ${r19.toString()}.`
                        ),
                    });
                }
            });
        })();

        (function edu_106_cap2_c01_gte_c02() {
            const ROWS = Array.from({ length: 18 }, (_, i) => i + 1); // 1..18 (extinde dacă ai și alte rânduri)
            ROWS.forEach((r) => {
                const c1 = decOrNull(values[`CAP2_R${r}_C01`]);
                const c2 = decOrNull(values[`CAP2_R${r}_C02`]);

                // ambele goale → ignorăm; ambele 0 → ignorăm; așteptăm până sunt ambele numerice
                if (c1 === null && c2 === null) return;
                if (bothZero(c1, c2)) return;
                if (c1 === null || c2 === null) return;

                if (c1.lt(c2)) {
                    webform.errors.push({
                        fieldName: `CAP2_R${r}_C01`,
                        msg: Drupal.t(
                            `[EDU-106]. Cap.2 rînd.${String(r).padStart(
                                2,
                                "0"
                            )} col.1 (${c1}) trebuie să fie mai mare sau egal cu col.2 (${c2}).`
                        ),
                    });
                }
            });
        })();

        (function edu_105_cap2_row_totals() {
            // dacă vrei doar pentru rândurile 16 și 17, folosește [16,17]; eu îl las generic
            const ROWS = Array.from({ length: 19 }, (_, i) => i + 1); // 1..19
            ROWS.forEach((r) => {
                const c14 = decOrNull(values[`CAP2_R${r}_C14`]);
                const colsToSum = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
                let sum = new Decimal(0),
                    anyPos = false;

                colsToSum.forEach((c) => {
                    const v = decOrNull(
                        values[`CAP2_R${r}_C${String(c).padStart(2, "0")}`]
                    );
                    if (v) {
                        sum = sum.plus(v);
                        if (!v.isZero()) anyPos = true;
                    }
                });

                if (!anyPos && (c14 === null || c14.isZero())) return;
                if (c14 === null) return;

                if (!c14.equals(sum)) {
                    webform.errors.push({
                        fieldName: `CAP2_R${r}_C14`,
                        msg: Drupal.t(
                            `[EDU-105]. Cap.2 rînd.${String(r).padStart(
                                2,
                                "0"
                            )} col.14 (${c14}) trebuie să fie egal cu suma col.1 și col.3–13 (${sum}).`
                        ),
                    });
                }
            });
        })();

        (function () {
            // --------------------------------------------------
            // [EDU-201] CAP8: rînd.01 = sumă rînd.02–04 pe toate coloanele (1–4)
            // --------------------------------------------------
            for (let c = 1; c <= 4; c++) {
                const col = c.toString().padStart(2, "0");

                const r2 = new Decimal(values[`CAP8_R2_C${col}`] || 0);
                const r3 = new Decimal(values[`CAP8_R3_C${col}`] || 0);
                const r4 = new Decimal(values[`CAP8_R4_C${col}`] || 0);
                const sum = r2.plus(r3).plus(r4);

                const r1 = new Decimal(values[`CAP8_R1_C${col}`] || 0);

                if (!r1.eq(sum)) {
                    webform.errors.push({
                        fieldName: `CAP8_R1_C${col}`,
                        msg: Drupal.t(
                            `[EDU-201]. Cap.8 rînd.01 col.${c} (${r1.toString()}) trebuie să fie egal cu suma rînd.02–04 din aceeași coloană (${sum.toString()}).`
                        ),
                    });
                }
            }

            // --------------------------------------------------
            // [EDU-202] CAP8: col.1 = sumă col.2–4 pe toate rîndurile (01–04)
            // --------------------------------------------------
            for (let r = 1; r <= 4; r++) {
                const rStr = r.toString();

                const c2 = new Decimal(values[`CAP8_R${rStr}_C02`] || 0);
                const c3 = new Decimal(values[`CAP8_R${rStr}_C03`] || 0);
                const c4 = new Decimal(values[`CAP8_R${rStr}_C04`] || 0);
                const sum = c2.plus(c3).plus(c4);

                const c1 = new Decimal(values[`CAP8_R${rStr}_C01`] || 0);

                if (!c1.eq(sum)) {
                    webform.errors.push({
                        fieldName: `CAP8_R${rStr}_C01`,
                        msg: Drupal.t(
                            `[EDU-202]. Cap.8 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.1 (${c1.toString()}) trebuie să fie egal cu suma col.2–4 (${sum.toString()}).`
                        ),
                    });
                }
            }
        })();

        (function () {
            // ---------------------------------------------
            // [EDU-601] CAP6: rînd.18 = suma rîndurilor 01–17 pe toate coloanele
            // ---------------------------------------------
            for (let c = 1; c <= 13; c++) {
                const col = c.toString().padStart(2, "0");

                let sum = new Decimal(0);
                for (let r = 1; r <= 17; r++) {
                    const rStr = r.toString();
                    const val = new Decimal(values[`CAP6_R${rStr}_C${col}`] || 0);
                    sum = sum.plus(val);
                }

                const r18 = new Decimal(values[`CAP6_R18_C${col}`] || 0);
                if (!r18.eq(sum)) {
                    webform.errors.push({
                        fieldName: `CAP6_R18_C${col}`,
                        msg: Drupal.t(
                            `[EDU-601]. Cap.6 rînd.18 col.${c} (${r18.toString()}) trebuie să fie egal cu suma rîndurilor 01–17 din aceeași coloană (${sum.toString()}).`
                        ),
                    });
                }
            }

            // ---------------------------------------------
            // [EDU-602] CAP6: col.12 >= col.13 pe toate rîndurile (01–18)
            // ---------------------------------------------
            for (let r = 1; r <= 18; r++) {
                const rStr = r.toString();
                const c12 = new Decimal(values[`CAP6_R${rStr}_C12`] || 0);
                const c13 = new Decimal(values[`CAP6_R${rStr}_C13`] || 0);

                if (c12.lt(c13)) {
                    webform.errors.push({
                        fieldName: `CAP6_R${rStr}_C12`,
                        msg: Drupal.t(
                            `[EDU-602]. Cap.6 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.12 (${c12.toString()}) trebuie să fie ≥ col.13 (${c13.toString()}).`
                        ),
                    });
                }
            }
        })();

        (function () {
            // [EDU-603] Cap.6: dacă rînd.11-18 col.12 ≠ 0 atunci col.13 ≠ 0
            // și invers: dacă col.13 ≠ 0 atunci col.12 ≠ 0
            for (let r = 11; r <= 18; r++) {
                const rStr = r.toString();
                const c12 = new Decimal(values[`CAP6_R${rStr}_C12`] || 0);
                const c13 = new Decimal(values[`CAP6_R${rStr}_C13`] || 0);

                // 1) col.12 ≠ 0 -> col.13 ≠ 0
                if (!c12.isZero() && c13.isZero()) {
                    webform.errors.push({
                        fieldName: `CAP6_R${rStr}_C13`,
                        msg: Drupal.t(
                            `[EDU-603]. Cap.6 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.13 trebuie completat (col.12 este diferit de 0).`
                        ),
                    });
                }

                // 2) col.13 ≠ 0 -> col.12 ≠ 0
                if (!c13.isZero() && c12.isZero()) {
                    webform.errors.push({
                        fieldName: `CAP6_R${rStr}_C12`,
                        msg: Drupal.t(
                            `[EDU-603]. Cap.6 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.12 trebuie completat (col.13 este diferit de 0).`
                        ),
                    });
                }
            }
        })();

        // CAP.5 – validări

        (function () {
            // 1) Cap.5 rînd.18 = suma rîndurilor 01–17 pe toate coloanele
            // în tabel ai coloanele 1..13
            for (let c = 1; c <= 13; c++) {
                const col = c.toString().padStart(2, "0");
                let sum = new Decimal(0);
                for (let r = 1; r <= 17; r++) {
                    const rStr = r.toString();
                    sum = sum.plus(new Decimal(values[`CAP5_R${rStr}_C${col}`] || 0));
                }
                const v18 = new Decimal(values[`CAP5_R18_C${col}`] || 0);
                if (!v18.equals(sum)) {
                    webform.errors.push({
                        fieldName: `CAP5_R18_C${col}`,
                        msg: Drupal.t(
                            `[EDU-501]. Cap.5 rînd.18 col.${c} trebuie să fie egal cu suma rîndurilor 01–17 col.${c}. Valori: (${v18} ≠ ${sum})`
                        ),
                    });
                }
            }
        })();

        (function () {
            // 2) Cap.5 col.12 >= col.13 pe toate rîndurile (01–18, poți extinde dacă mai apar)
            for (let r = 1; r <= 18; r++) {
                const rStr = r.toString();
                const c12 = new Decimal(values[`CAP5_R${rStr}_C12`] || 0);
                const c13 = new Decimal(values[`CAP5_R${rStr}_C13`] || 0);

                if (c12.lt(c13)) {
                    webform.errors.push({
                        fieldName: `CAP5_R${rStr}_C12`,
                        msg: Drupal.t(
                            `[EDU-502]. Cap.5 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.12 trebuie să fie ≥ col.13. Valori: (${c12} < ${c13})`
                        ),
                    });
                }
            }
        })();

        (function () {
            // 3) Cap.5 dacă (rînd.11–18)(col.12) ≠ 0 atunci (rînd.11–18)(col.13) ≠ 0
            // 4) Cap.5 dacă (rînd.11–18)(col.13) ≠ 0 atunci (rînd.11–18)(col.12) ≠ 0
            for (let r = 11; r <= 18; r++) {
                const rStr = r.toString();
                const c12 = new Decimal(values[`CAP5_R${rStr}_C12`] || 0);
                const c13 = new Decimal(values[`CAP5_R${rStr}_C13`] || 0);

                // 3)
                if (!c12.isZero() && c13.isZero()) {
                    webform.errors.push({
                        fieldName: `CAP5_R${rStr}_C13`,
                        msg: Drupal.t(
                            `[EDU-503]. Cap.5 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.13 trebuie completat (col.12 este ≠ 0).`
                        ),
                    });
                }

                // 4)
                if (!c13.isZero() && c12.isZero()) {
                    webform.errors.push({
                        fieldName: `CAP5_R${rStr}_C12`,
                        msg: Drupal.t(
                            `[EDU-503]. Cap.5 rînd.${rStr.padStart(
                                2,
                                "0"
                            )} col.12 trebuie completat (col.13 este ≠ 0).`
                        ),
                    });
                }
            }
        })();

        // CAP.4 – validări
        (function () {
            // 1) Rînd.13 = suma rîndurilor 01–12 pe toate coloanele
            // ai spus "pe toate coloane" și mai jos folosești col.4–13, deci mergem până la 13
            for (let c = 1; c <= 13; c++) {
                const col = c.toString().padStart(2, "0");
                let sum = new Decimal(0);
                for (let r = 1; r <= 12; r++) {
                    const rStr = r.toString();
                    sum = sum.plus(new Decimal(values[`CAP4_R${rStr}_C${col}`] || 0));
                }
                const v13 = new Decimal(values[`CAP4_R13_C${col}`] || 0);
                if (!v13.equals(sum)) {
                    webform.errors.push({
                        fieldName: `CAP4_R13_C${col}`,
                        msg: Drupal.t(
                            `[EDU-401]. Cap.4 rînd.13 col.${c} trebuie să fie egal cu suma rîndurilor 01–12 col.${c}. Valori: (${v13} ≠ ${sum})`
                        ),
                    });
                }
            }
        })();

        (function () {
            // 2) Col.1 = sum(col.2, col.3) pe toate rîndurile (1–13)
            for (let r = 1; r <= 13; r++) {
                const rStr = r.toString();
                const c1 = new Decimal(values[`CAP4_R${rStr}_C01`] || 0);
                const c2 = new Decimal(values[`CAP4_R${rStr}_C02`] || 0);
                const c3 = new Decimal(values[`CAP4_R${rStr}_C03`] || 0);
                const sum23 = c2.plus(c3);

                if (!c1.equals(sum23)) {
                    webform.errors.push({
                        fieldName: `CAP4_R${rStr}_C01`,
                        msg: Drupal.t(
                            `[EDU-402]. Cap.4 rînd.${rStr
                                .toString()
                                .padStart(
                                    2,
                                    "0"
                                )} col.1 trebuie să fie egal cu col.2 + col.3. Valori: (${c1} ≠ ${sum23})`
                        ),
                    });
                }
            }
        })();

        (function () {
            // 3) Col.1 <= suma col.4–13 pe toate rîndurile (1–13)
            for (let r = 1; r <= 13; r++) {
                const rStr = r.toString();
                const c1 = new Decimal(values[`CAP4_R${rStr}_C01`] || 0);

                let sum4_13 = new Decimal(0);
                for (let c = 4; c <= 13; c++) {
                    const col = c.toString().padStart(2, "0");
                    sum4_13 = sum4_13.plus(
                        new Decimal(values[`CAP4_R${rStr}_C${col}`] || 0)
                    );
                }

                if (c1.gt(sum4_13)) {
                    webform.errors.push({
                        fieldName: `CAP4_R${rStr}_C01`,
                        msg: Drupal.t(
                            `[EDU-403]. Cap.4 rînd.${rStr
                                .toString()
                                .padStart(
                                    2,
                                    "0"
                                )} col.1 trebuie să fie ≤ suma col.4–13. Valori: (${c1} > ${sum4_13})`
                        ),
                    });
                }
            }
        })();

        (function () {
            // [EDU-1201] Cap.12 rînd.01 col.2 ≤ suma col.3–12
            const r = 1; // doar rîndul 01
            const c2 = new Decimal(values[`CAP12_R${r}_C02`] || 0);

            let sum3_12 = new Decimal(0);
            for (let c = 3; c <= 12; c++) {
                const col = c.toString().padStart(2, "0");
                sum3_12 = sum3_12.plus(new Decimal(values[`CAP12_R${r}_C${col}`] || 0));
            }

            if (c2.gt(sum3_12)) {
                webform.errors.push({
                    fieldName: `CAP12_R${r}_C02`,
                    msg: Drupal.t(
                        `[EDU-1201]. Cap.12 rînd.01 col.2 (${c2.toString()}) nu trebuie să depășească suma col.3–12 (${sum3_12.toString()}).`
                    ),
                });
            }
        })();

        (function cap1_r21_lt_r19() {
            const cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

            cols.forEach((c) => {
                const cc = String(c).padStart(2, "0");
                const f21 = `CAP1_R21_C${cc}`;
                const f19 = `CAP1_R19_C${cc}`;

                // dacă niciun input nu există pentru col. asta, ieșim
                if (!(f21 in values) && !(f19 in values)) return;

                const v21raw = values[f21];
                const v19raw = values[f19];
                const v21 = decOrNull(v21raw);
                const v19 = decOrNull(v19raw);

                // ambele goale -> ignorăm
                if (v21 === null && v19 === null) return;
                // ambele exact 0 -> ignorăm (nu spamăm cu 0 ≥ 0)
                if (bothZero(v21, v19)) return;
                // așteptăm până când SUNT ambele numerice
                if (v21 === null || v19 === null) return;

                if (!v21.lt(v19)) {
                    webform.errors.push({
                        fieldName: isNumeric(v21raw) ? f21 : f19, // marchează cel completat
                        msg: Drupal.t(
                            `[EDU-1-21-19]. Cap.1 rînd.21 col.${c} trebuie să fie mai mic decât rînd.19 col.${c}. Valori: (${v21} ≥ ${v19})`
                        ),
                    });
                }
            });
        })();

        (function () {
            const cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
            cols.forEach(function (c) {
                const col = c.toString().padStart(2, "0");
                const v21 = new Decimal(values[`CAP1_R21_C${col}`] || 0);
                const v20 = new Decimal(values[`CAP1_R20_C${col}`] || 0);
                if (v21.gt(v20)) {
                    webform.errors.push({
                        fieldName: `CAP1_R21_C${col}`,
                        msg: Drupal.t(
                            `[EDU-1-21-20]. Cap.1 rînd.21 col.${c} nu trebuie să depășească rînd.20 col.${c}. Valori: (${v21} > ${v20})`
                        ),
                    });
                }
            });
        })();

        // CAP.11 Col.1 >= Col.2 pe toate rîndurile
        (function () {
            // pune aici lista de rînduri reale din CAP11
            var rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // ajustezi dacă ai mai multe/mai puține
            rows.forEach(function (r) {
                var rr = r.toString().padStart(2, "0");
                var c1 = new Decimal(values["CAP11_R" + rr + "_C01"] || 0);
                var c2 = new Decimal(values["CAP11_R" + rr + "_C02"] || 0);
                if (c1.lt(c2)) {
                    webform.errors.push({
                        fieldName: "CAP11_R" + rr + "_C01",
                        msg: Drupal.t(
                            "[EDU-11-C1C2]. Cap.11 rînd." +
                            rr +
                            " col.1 trebuie să fie ≥ col.2. Valori: (" +
                            c1 +
                            " < " +
                            c2 +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP.11 Col.1 >= Col.3 pe toate rîndurile
        (function () {
            var rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // aceeași listă ca mai sus
            rows.forEach(function (r) {
                var rr = r.toString().padStart(2, "0");
                var c1 = new Decimal(values["CAP11_R" + rr + "_C01"] || 0);
                var c3 = new Decimal(values["CAP11_R" + rr + "_C03"] || 0);
                if (c1.lt(c3)) {
                    webform.errors.push({
                        fieldName: "CAP11_R" + rr + "_C01",
                        msg: Drupal.t(
                            "[EDU-11-C1C3]. Cap.11 rînd." +
                            rr +
                            " col.1 trebuie să fie ≥ col.3. Valori: (" +
                            c1 +
                            " < " +
                            c3 +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP.2 Rând.21 < Rând.19 pe coloanele 1, 3-14
        (function cap2_r21_lt_r19() {
            const cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

            cols.forEach((c) => {
                const cc = String(c).padStart(2, "0");
                const f21 = `CAP2_R21_C${cc}`;
                const f19 = `CAP2_R19_C${cc}`;

                if (!(f21 in values) && !(f19 in values)) return;

                const v21raw = values[f21];
                const v19raw = values[f19];
                const v21 = decOrNull(v21raw);
                const v19 = decOrNull(v19raw);

                if (v21 === null && v19 === null) return;
                if (bothZero(v21, v19)) return;
                if (v21 === null || v19 === null) return;

                if (!v21.lt(v19)) {
                    webform.errors.push({
                        fieldName: isNumeric(v21raw) ? f21 : f19,
                        msg: Drupal.t(
                            `[EDU-C2-21LT19] Cap.2 rînd.21 col.${c} trebuie să fie mai mic decât rînd.19 col.${c}. Valori: (${v21} ≥ ${v19})`
                        ),
                    });
                }
            });
        })();

        // CAP.2 Rând.21 ≤ Rând.20 pe coloanele 1, 3-14
        (function () {
            var cols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
            cols.forEach(function (c) {
                var f20 = "CAP2_R20_C" + (c < 10 ? "0" + c : c);
                var f21 = "CAP2_R21_C" + (c < 10 ? "0" + c : c);

                var v20 = new Decimal(values[f20] || 0);
                var v21 = new Decimal(values[f21] || 0);

                if (v21.greaterThan(v20)) {
                    webform.errors.push({
                        fieldName: f21,
                        msg: Drupal.t(
                            "[EDU-C2-21LE20] Cap.2 rînd.21 col." +
                            c +
                            " nu poate depăși rînd.20 col." +
                            c +
                            ". Valori: (" +
                            v21 +
                            " > " +
                            v20 +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP.2 Dacă (Rând.19)(Col.1) ≠ 0, atunci (Rând.19)(Col.2) ≠ 0
        (function () {
            var c1 = new Decimal(values["CAP2_R19_C01"] || 0);
            var c2 = new Decimal(values["CAP2_R19_C02"] || 0);

            if (!c1.isZero() && c2.isZero()) {
                webform.errors.push({
                    fieldName: "CAP2_R19_C02",
                    msg: Drupal.t(
                        "[EDU-C2-19C1C2] Cap.2 rînd.19 col.2 trebuie completată dacă rînd.19 col.1 este diferită de 0. Valori: (col.1=" +
                        c1 +
                        ", col.2=" +
                        c2 +
                        ")"
                    ),
                });
            }
        })();

        // CAP10: Rînd.01 col.1 >= Rînd.03 col.1
        (function () {
            var v1 = new Decimal(values["CAP10_R1_C01"] || 0);
            var v3 = new Decimal(values["CAP10_R3_C01"] || 0);

            if (v1.lessThan(v3)) {
                webform.errors.push({
                    fieldName: "CAP10_R1_C01",
                    msg: Drupal.t(
                        "[EDU-C10-1GE3] Cap.10 rînd.01 col.1 trebuie să fie ≥ rînd.03 col.1. Valori: (" +
                        v1 +
                        " < " +
                        v3 +
                        ")"
                    ),
                });
            }
        })();

        // CAP10: Rînd.09,10,11,14,15,17,18,19 col.1 = 0 sau 1
        (function () {
            var rows = [9, 10, 11, 14, 15, 17, 18, 19];
            rows.forEach(function (r) {
                var f = "CAP10_R" + r + "_C01";
                var v = new Decimal(values[f] || 0);

                // trebuie să fie exact 0 sau 1
                if (!(v.equals(0) || v.equals(1))) {
                    webform.errors.push({
                        fieldName: f,
                        msg: Drupal.t(
                            "[EDU-C10-01BIN] Cap.10 rînd." +
                            (r < 10 ? "0" + r : r) +
                            " col.1 poate fi doar 0 sau 1. Valoare: " +
                            v
                        ),
                    });
                }
            });
        })();

        // CAP10: Rînd.12,13 col.1 = 0 sau > 1  (adică NU 1)
        (function () {
            var rows = [12, 13];
            rows.forEach(function (r) {
                var f = "CAP10_R" + r + "_C01";
                var v = new Decimal(values[f] || 0);

                // permis: 0 sau >1
                if (v.equals(1)) {
                    webform.errors.push({
                        fieldName: f,
                        msg: Drupal.t(
                            "[EDU-C10-12GT1] Cap.10 rînd." +
                            r +
                            " col.1 poate fi 0 sau mai mare ca 1, dar nu 1. Valoare: " +
                            v
                        ),
                    });
                }
            });
        })();

        // CAP3: Rînd.01 = suma rînd.02, 06, 10 pe toate coloanele (1-7)
        (function () {
            var cols = [1, 2, 3, 4, 5, 6, 7];
            cols.forEach(function (c) {
                var fTotal = "CAP3_R1_C0" + c;
                var vTotal = new Decimal(values[fTotal] || 0);

                var s = new Decimal(0);
                ["2", "6", "10"].forEach(function (r) {
                    var f = "CAP3_R" + r + "_C0" + c;
                    s = s.plus(new Decimal(values[f] || 0));
                });

                if (!vTotal.equals(s)) {
                    webform.errors.push({
                        fieldName: fTotal,
                        msg: Drupal.t(
                            "[EDU-C3-01] Cap.3 rînd.01 col." +
                            c +
                            " trebuie să fie egal cu suma rîndurilor 02, 06, 10 pe aceeași coloană. Valori: (" +
                            vTotal +
                            " ≠ " +
                            s +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP3: Rînd.02 = suma rînd.03-05 pe coloanele 1 și 3-7 (col.2 e 'x')
        (function () {
            var cols = [1, 3, 4, 5, 6, 7];
            cols.forEach(function (c) {
                var fTotal = "CAP3_R2_C0" + c;
                var vTotal = new Decimal(values[fTotal] || 0);

                var s = new Decimal(0);
                [3, 4, 5].forEach(function (r) {
                    var f = "CAP3_R" + r + "_C0" + c;
                    s = s.plus(new Decimal(values[f] || 0));
                });

                if (!vTotal.equals(s)) {
                    webform.errors.push({
                        fieldName: fTotal,
                        msg: Drupal.t(
                            "[EDU-C3-02] Cap.3 rînd.02 col." +
                            c +
                            " trebuie să fie egal cu suma rîndurilor 03-05 pe aceeași coloană. Valori: (" +
                            vTotal +
                            " ≠ " +
                            s +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP3: Rînd.06 = suma rînd.07-09 pe toate coloanele (1-7)
        (function () {
            var cols = [1, 2, 3, 4, 5, 6, 7];
            cols.forEach(function (c) {
                var fTotal = "CAP3_R6_C0" + c;
                var vTotal = new Decimal(values[fTotal] || 0);

                var s = new Decimal(0);
                [7, 8, 9].forEach(function (r) {
                    var f = "CAP3_R" + r + "_C0" + c;
                    s = s.plus(new Decimal(values[f] || 0));
                });

                if (!vTotal.equals(s)) {
                    webform.errors.push({
                        fieldName: fTotal,
                        msg: Drupal.t(
                            "[EDU-C3-06] Cap.3 rînd.06 col." +
                            c +
                            " trebuie să fie egal cu suma rîndurilor 07-09 pe aceeași coloană. Valori: (" +
                            vTotal +
                            " ≠ " +
                            s +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP3: Rînd.10 = suma rînd.11-13 pe toate coloanele (1-7)
        (function () {
            var cols = [1, 2, 3, 4, 5, 6, 7];
            cols.forEach(function (c) {
                var fTotal = "CAP3_R10_C0" + c;
                var vTotal = new Decimal(values[fTotal] || 0);

                var s = new Decimal(0);
                [11, 12, 13].forEach(function (r) {
                    var f = "CAP3_R" + r + "_C0" + c;
                    s = s.plus(new Decimal(values[f] || 0));
                });

                if (!vTotal.equals(s)) {
                    webform.errors.push({
                        fieldName: fTotal,
                        msg: Drupal.t(
                            "[EDU-C3-10] Cap.3 rînd.10 col." +
                            c +
                            " trebuie să fie egal cu suma rîndurilor 11-13 pe aceeași coloană. Valori: (" +
                            vTotal +
                            " ≠ " +
                            s +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP11: Rînd.010 = suma rînd.020–060 pe toate coloanele (1–3)
        (function () {
            var cols = [1, 2, 3];
            cols.forEach(function (c) {
                var fTotal = "CAP11_R1_C0" + c; // 010
                var vTotal = new Decimal(values[fTotal] || 0);

                var s = new Decimal(0);
                [2, 3, 4, 5, 6].forEach(function (r) {
                    // 020..060
                    var f = "CAP11_R" + r + "_C0" + c;
                    s = s.plus(new Decimal(values[f] || 0));
                });

                if (!vTotal.equals(s)) {
                    webform.errors.push({
                        fieldName: fTotal,
                        msg: Drupal.t(
                            "[EDU-C11-010] Cap.11 rînd.010 col." +
                            c +
                            " trebuie să fie egal cu suma rîndurilor 020–060 pe aceeași coloană. Valori: (" +
                            vTotal +
                            " ≠ " +
                            s +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP11: Rînd.020 = suma rînd.030–050 pe toate coloanele (1–3)
        (function () {
            var cols = [1, 2, 3];
            cols.forEach(function (c) {
                var fTotal = "CAP11_R2_C0" + c; // 020
                var vTotal = new Decimal(values[fTotal] || 0);

                var s = new Decimal(0);
                [3, 4, 5].forEach(function (r) {
                    // 030..050
                    var f = "CAP11_R" + r + "_C0" + c;
                    s = s.plus(new Decimal(values[f] || 0));
                });

                if (!vTotal.equals(s)) {
                    webform.errors.push({
                        fieldName: fTotal,
                        msg: Drupal.t(
                            "[EDU-C11-020] Cap.11 rînd.020 col." +
                            c +
                            " trebuie să fie egal cu suma rîndurilor 030–050 pe aceeași coloană. Valori: (" +
                            vTotal +
                            " ≠ " +
                            s +
                            ")"
                        ),
                    });
                }
            });
        })();

        // CAP5→CAP6: Dacă în CAP.5 rândul R (11–18) col.12 = col.13,
        // atunci în CAP.6 același rând col.12 trebuie să fie egal cu col.13.
        (function () {
            for (var r = 11; r <= 18; r++) {
                var f5c12 = "CAP5_R" + r + "_C12";
                var f5c13 = "CAP5_R" + r + "_C13";
                var v5c12 = new Decimal(values[f5c12] || 0);
                var v5c13 = new Decimal(values[f5c13] || 0);

                // Condiția declanșatoare în CAP.5
                if (v5c12.equals(v5c13)) {
                    var f6c12 = "CAP6_R" + r + "_C12";
                    var f6c13 = "CAP6_R" + r + "_C13";
                    var v6c12 = new Decimal(values[f6c12] || 0);
                    var v6c13 = new Decimal(values[f6c13] || 0);

                    if (!v6c12.equals(v6c13)) {
                        webform.errors.push({
                            fieldName: f6c12,
                            msg: Drupal.t(
                                "[EDU-C5C6-" +
                                r +
                                "] Dacă în Cap.5 rînd." +
                                r +
                                " col.12 = col.13 (" +
                                v5c12 +
                                " = " +
                                v5c13 +
                                "), atunci în Cap.6 rînd." +
                                r +
                                " col.12 trebuie să fie egal cu col.13. Valori: (" +
                                v6c12 +
                                " ≠ " +
                                v6c13 +
                                ")"
                            ),
                        });
                    }
                }
            }
        })();

        // CAP5 vs CAP6: pentru fiecare (rînd 1–18, col 1–13) trebuie CAP5 > CAP6.
        // Sărim peste celulele care NU există (cele „x” în HTML) și nu hașurăm câmpurile necompletate.
        (function () {
            function isBlank(v) {
                return v === "" || v === null || typeof v === "undefined";
            }

            for (var r = 1; r <= 18; r++) {
                for (var c = 1; c <= 13; c++) {
                    var cc = (c < 10 ? "0" : "") + c;

                    var f5 = "CAP5_R" + r + "_C" + cc;
                    var f6 = "CAP6_R" + r + "_C" + cc;

                    // Dacă ambele lipsesc complet (celule „x”), nu validăm
                    if (
                        typeof values[f5] === "undefined" &&
                        typeof values[f6] === "undefined"
                    )
                        continue;

                    var s5 = values[f5];
                    var s6 = values[f6];

                    var has5 = !isBlank(s5);
                    var has6 = !isBlank(s6);

                    // Dacă ambele sunt goale, nu validăm (nu generăm erori inutile)
                    if (!has5 && !has6) continue;

                    // Dacă lipsește una dintre valori, nu hașurăm câmpuri: dăm mesaj global, clar
                    if (!has5 || !has6) {
                        var cap5Show = has5 ? String(s5) : "—";
                        var cap6Show = has6 ? String(s6) : "—";
                        webform.errors.push({
                            fieldName: null, // NU colora/hașura vreun câmp
                            msg: Drupal.t(
                                "Cap. 5 Rand. " +
                                r +
                                " Col." +
                                c +
                                " - [EDU-C5C6-GT-" +
                                r +
                                "-" +
                                cc +
                                "]. " +
                                "Completați ambele valori pentru comparație (Cap.5 > Cap.6). " +
                                "Valori: (" +
                                "Cap.5=" +
                                cap5Show +
                                ", Cap.6=" +
                                cap6Show +
                                ")"
                            ),
                        });
                        continue;
                    }

                    // Ambele valori prezente -> validăm strict: CAP5 > CAP6
                    var v5 = new Decimal(s5);
                    var v6 = new Decimal(s6);

                    if (!v5.gt(v6)) {
                        webform.errors.push({
                            // atașăm eroarea pe CAP5 (cîmpul care trebuie să fie mai mare)
                            fieldName: f5,
                            msg: Drupal.t(
                                "Cap. 5 Rand. " +
                                r +
                                " Col." +
                                c +
                                " - [EDU-C5C6-GT-" +
                                r +
                                "-" +
                                cc +
                                "]. " +
                                "Cap.5 rînd." +
                                r +
                                " col." +
                                c +
                                " trebuie să fie STRICT mai mare decît " +
                                "Cap.6 rînd." +
                                r +
                                " col." +
                                c +
                                ". " +
                                "Valori: (Cap.5=" +
                                v5 +
                                ", Cap.6=" +
                                v6 +
                                ")"
                            ),
                        });
                    }
                }
            }
        })();

        // CAP3: Col.1 >= Col.X pentru X = 2..7, pe toate rîndurile existente.
        // Sărim peste celulele „x” (cele fără input/indefinite).
        (function () {
            for (var r = 1; r <= 13; r++) {
                var f1 = "CAP3_R" + r + "_C01";
                // dacă nici măcar totalul nu există pe rândul curent, trecem peste
                if (typeof values[f1] === "undefined") continue;

                var v1 = new Decimal(values[f1] || 0);

                for (var c = 2; c <= 7; c++) {
                    var cc = "0" + c; // 02..07
                    var fx = "CAP3_R" + r + "_C" + cc;

                    // dacă coloana X nu există (marcată „x” în HTML), o sărim
                    if (typeof values[fx] === "undefined") continue;

                    var vx = new Decimal(values[fx] || 0);

                    if (v1.lt(vx)) {
                        webform.errors.push({
                            fieldName: f1, // evidențiem totalul rîndului ca sursă a abaterii
                            msg: Drupal.t(
                                "[CAP3-C1GE-" +
                                r +
                                "-" +
                                cc +
                                "] Pe rîndul " +
                                r +
                                " valoarea din Col.1 (Total=" +
                                v1 +
                                ") trebuie să fie ≥ valoarea din Col." +
                                c +
                                " (= " +
                                vx +
                                ")."
                            ),
                        });
                    }
                }
            }
        })();
        // CAP3: Col.1 >= Col.X pentru X = 2..7, pe toate rîndurile existente.
        // Sărim peste celulele „x” (cele fără input/indefinite).
        (function () {
            for (var r = 1; r <= 13; r++) {
                var f1 = "CAP3_R" + r + "_C01";
                // dacă nici măcar totalul nu există pe rândul curent, trecem peste
                if (typeof values[f1] === "undefined") continue;

                var v1 = new Decimal(values[f1] || 0);

                for (var c = 2; c <= 7; c++) {
                    var cc = "0" + c; // 02..07
                    var fx = "CAP3_R" + r + "_C" + cc;

                    // dacă coloana X nu există (marcată „x” în HTML), o sărim
                    if (typeof values[fx] === "undefined") continue;

                    var vx = new Decimal(values[fx] || 0);

                    if (v1.lt(vx)) {
                        webform.errors.push({
                            fieldName: f1, // evidențiem totalul rîndului ca sursă a abaterii
                            msg: Drupal.t(
                                "[CAP3-C1GE-" +
                                r +
                                "-" +
                                cc +
                                "] Pe rîndul " +
                                r +
                                " valoarea din Col.1 (Total=" +
                                v1 +
                                ") trebuie să fie ≥ valoarea din Col." +
                                c +
                                " (= " +
                                vx +
                                ")."
                            ),
                        });
                    }
                }
            }
        })();

        // CAP3: Col.1 >= Col.X pentru X = 2..7, pe toate rîndurile existente.
        // Sărim peste celulele „x” (cele fără input/indefinite).
        (function () {
            for (var r = 1; r <= 13; r++) {
                var f1 = "CAP3_R" + r + "_C01";
                // dacă nici măcar totalul nu există pe rândul curent, trecem peste
                if (typeof values[f1] === "undefined") continue;

                var v1 = new Decimal(values[f1] || 0);

                for (var c = 2; c <= 7; c++) {
                    var cc = "0" + c; // 02..07
                    var fx = "CAP3_R" + r + "_C" + cc;

                    // dacă coloana X nu există (marcată „x” în HTML), o sărim
                    if (typeof values[fx] === "undefined") continue;

                    var vx = new Decimal(values[fx] || 0);

                    if (v1.lt(vx)) {
                        webform.errors.push({
                            fieldName: f1, // evidențiem totalul rîndului ca sursă a abaterii
                            msg: Drupal.t(
                                "[CAP3-C1GE-" +
                                r +
                                "-" +
                                cc +
                                "] Pe rîndul " +
                                r +
                                " valoarea din Col.1 (Total=" +
                                v1 +
                                ") trebuie să fie ≥ valoarea din Col." +
                                c +
                                " (= " +
                                vx +
                                ")."
                            ),
                        });
                    }
                }
            }
        })();

        webform.validatorsStatus["edu1"] = 1;
        validateWebform();
    };
})(jQuery);
