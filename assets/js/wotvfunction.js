// Functions for WOTV-related data parsing/calculation
// Ensure that helper.js is called with the .html file where these methods are used

async function getLevelStats(unit_iname) {
    let promise = await new Promise((resolve, reject) => { 
        let unitPromise = loadJSONPromise('./assets/dump/data/Unit.json');
        let jobPromise = loadJSONPromise('./assets/dump/data/Job.json');
        let unitAbilityBoardPromise = loadJSONPromise('./assets/dump/data/UnitAbilityBoard.json');
        let buffPromise = loadJSONPromise('./assets/dump/data/Buff.json');
        let skillPromise = loadJSONPromise('./assets/dump/data/Skill.json')
        var promiseList = [unitPromise, jobPromise, unitAbilityBoardPromise, buffPromise, skillPromise];
        Promise.all(promiseList).then((values) => {
            unit = parse_AnyData(values[0],"iname");
            job = parse_AnyData(values[1],"iname");
            unitAbilityBoard = parse_AnyData(values[2],"iname");
            buff = parse_AnyData(values[3],"iname");
            skill = parse_AnyData(values[4],"iname");

            resolve(get_unit_stats(unit_iname));
        });
    }).catch(err => console.log(err));

    return promise;
}

//-----------------------------------------------------------------------------------
// Credit to Krazplay at https://github.com/Krazplay/wotv for the following functions

function parse_AnyData(data, iname, iname2 = null) {
	let mapData = new Map();
	data.items.forEach((item) => {
		mapData.set(iname2 ? item[iname]+item[iname2] : item[iname], item);
	});
	return mapData;
}

// Get level stats 1, 99, and 120, then if lvl 99 or 120, add job_bonus stats
function get_unit_stats(unit_iname) {
	rstats = []; // Result, an array of stats hashes [{lv1},{lv99},{lv120}]
	unit_obj = unit.get(unit_iname);
	
	// Must have status, units like chests don't have one
	if (unit_obj.status) {
		// Status => [{Lv1}, {Lv99}, {Lv120}]
		for (let i=0; unit_obj.status[i]; i++) {
			if (!rstats[i]) rstats[i] =	{};
			if (!rstats[i]["base"]) rstats[i]["base"] =	{};
			if (!rstats[i]["total"]) rstats[i]["total"] =	{};
			rstats[i]["base"]["lvl"] = ["1","99","120"][i];
			// Easier name for current level stats
			let lvl_stats = unit_obj.status[i];
			// Get the jobs % stats bonuses
			job_bonus = {};
			// If the unit has jobs, grab bonus rates of all jobs, ignore for level 1
			if (unit_obj.jobsets && i>0) {
				unit_obj.jobsets.forEach((job_id, index) => {
					job_obj = job.get(job_id);
					// First job bonus is 100%, else use the sub_rate (always 50% so far)
					let rate = (index == 0) ? 100 : job_obj["sub_rate"]
					// Sometimes we don't have full stats in a job, we only have them in the 'origin' job
					let job_origin = job.get(job_obj["origin"]);
					// If no val for iniap in unit, use the main job one // todo check EX jobs
					if (index == 0 && lvl_stats["iniap"] == null) {
						if (job_obj["ranks"][14]) lvl_stats["iniap"] = job_obj["ranks"][14]["iniap"];
						else lvl_stats["iniap"] = job_origin["ranks"][14]["iniap"];
					}
					// For each stat, calculate the sum of job % bonus
					stats_list.forEach((stat) => {
						if (job_bonus[stat] == null) job_bonus[stat] = 0; // init
						// EX job replace the old job, check if level>=120, it's main job, and ccsets exist
						if (i>1 && index == 0 && unit_obj["ccsets"]) {
							let exjob_obj = job.get(unit_obj["ccsets"][0]["m"]);
							// Tricky, if EX stats are missing, check the job in param 'origin'
							if (exjob_obj["ranks"][9] == null) {
								exjob_obj = job.get(exjob_obj["origin"]);
							}
							// If the stat rate bonus exist, add it to job_bonus
							if (exjob_obj["ranks"][9][stat]) {
								job_bonus[stat] += exjob_obj["ranks"][9][stat] * rate / 100;
							}
						}
						else {
							// If the stat rate bonus exist, add it to job_bonus
							if (job_obj["ranks"][14] && job_obj["ranks"][14][stat]) {
								job_bonus[stat] += job_obj["ranks"][14][stat] * rate / 100;
							}
							// Once again trick, stat may be only in origin job
							else if (job_origin && job_origin["ranks"][14][stat]) {
								job_bonus[stat] += job_origin["ranks"][14][stat] * rate / 100;
							}
						}
					});
				});
			}
			// Calculate the stats
			stats_list.forEach((stat) => {
				if (job_bonus[stat] == null) job_bonus[stat] = 0;
				if (lvl_stats[stat]) {
					rstats[i]["base"][stat] = lvl_stats[stat];
					rstats[i]["base"][stat] += Math.floor(lvl_stats[stat] * job_bonus[stat] / 10000);
				}
				//else { rstats[i]["base"][stat] = ""; }
				rstats[i]["total"][stat] = rstats[i]["base"][stat];
			});
			// Can't have kill stats with base stats
			//rstats[i]["base"]["kill"] = [];
			
			//---------------------------
			// Board stats
			//---------------------------
			if (i>0) {
				// init
				if (!rstats[i]["board"]) rstats[i]["board"] = {};
				// Assume lvl99 = job lvl 15 is max, lvl 120 => main job level 25
				let board_job_level = [0,15,25][i];
				// Get the sum of bonuses for this job level
				let board_bonus = get_unit_board_bonuses(unit_obj.iname, board_job_level);
				// Add the bonuses to the hash "board"
				
				for (const [stat, bonus_amnt] of Object.entries(board_bonus["%"])) {
					if (!rstats[i]["board"][stat]) rstats[i]["board"][stat] = 0;
					if (!rstats[i]["total"][stat]) rstats[i]["total"][stat] = 0;
					let gain = Math.floor(bonus_amnt * rstats[i]["base"][stat] / 100);
					rstats[i]["board"][stat] += gain;
					rstats[i]["total"][stat] += gain;
				}
				for (const [stat, bonus_amnt] of Object.entries(board_bonus["+"])) {
					if (!rstats[i]["board"][stat]) rstats[i]["board"][stat] = 0;
					if (!rstats[i]["total"][stat]) rstats[i]["total"][stat] = 0;
					rstats[i]["board"][stat] += bonus_amnt;
					rstats[i]["total"][stat] += bonus_amnt;
				}
				if (board_bonus["kill"]) rstats[i]["board"]["kill"] = union(rstats[i]["board"]["kill"], board_bonus["kill"]);
				if (board_bonus["kill"]) rstats[i]["total"]["kill"] = union(rstats[i]["total"]["kill"], board_bonus["kill"]);
				// Party bonuses
				if (board_bonus["party"]) rstats[i]["board"]["party"] = board_bonus["party"];
				if (board_bonus["party"]) rstats[i]["total"]["party"] = board_bonus["party"];
			}
			
			//---------------------------
			// Master skill stats
			//---------------------------
			if (i>0 && unit_obj.mstskl) {
				// Get only the last master skill (when more than one, they don't stack)
				let mst_skl_id = unit_obj.mstskl[unit_obj.mstskl.length-1];
				let list_buffs = get_buffs_from_skill_id(mst_skl_id);
				let bonuses = { "%":{}, "+":{} };
				list_buffs.forEach((buff_id) => {
					bonuses = sum_of_bonuses(bonuses, buff_id_to_stat(buff_id));
				});
				// init
				if (!rstats[i]["master"]) rstats[i]["master"] = {};
				// Add master bonus to the hash "master"
				for (const [stat, bonus_amnt] of Object.entries(bonuses["%"])) {
					if (!rstats[i]["master"][stat]) rstats[i]["master"][stat] = 0;
					if (!rstats[i]["total"][stat]) rstats[i]["total"][stat] = 0;
					let gain = Math.floor(bonus_amnt * rstats[i]["base"][stat] / 100);
					rstats[i]["master"][stat] += gain;
					rstats[i]["total"][stat] += gain;
				}
				for (const [stat, bonus_amnt] of Object.entries(bonuses["+"])) {
					if (!rstats[i]["master"][stat]) rstats[i]["master"][stat] = 0;
					if (!rstats[i]["total"][stat]) rstats[i]["total"][stat] = 0;
					rstats[i]["master"][stat] += bonus_amnt;
					rstats[i]["total"][stat] += bonus_amnt;
				}
				if (bonuses["kill"]) rstats[i]["master"]["kill"] = union(rstats[i]["master"]["kill"], bonuses["kill"]);
				if (bonuses["kill"]) rstats[i]["total"]["kill"] = union(rstats[i]["total"]["kill"], bonuses["kill"]);
				
				// Party bonuses
				if (bonuses["party"]) rstats[i]["master"]["party"] = bonuses["party"];
				if (bonuses["party"]) rstats[i]["total"]["party"] = sum_party_stats(rstats[i]["total"]["party"], bonuses["party"]);
			}
			
			// Still doubting about -1 in acc and evade => cause rounding issue when negative ? may switch to "worse round"
			// Accuracy = 11*dex^0.20 /20   + luk^0.96/200 -1
			// Evade    = 11*agi^0.90 /1000 + luk^0.96/200 -1
			// Crit     =    dex^0.35 / 4 -1
			// Crit avd =    luk^0.37 / 5 -1
			rstats[i]["base"]["hit_stat"]  = Math.floor( (100*11*Math.pow(rstats[i]["base"]["dex"], 0.20)/20) + (100*Math.pow(rstats[i]["base"]["luk"], 0.96)/200) - 100 )
			rstats[i]["total"]["hit_stat"] = Math.floor( (100*11*Math.pow(rstats[i]["total"]["dex"], 0.20)/20) + (100*Math.pow(rstats[i]["total"]["luk"], 0.96)/200) - 100 )
			if (rstats[i]["total"]["hit"]) rstats[i]["total"]["hit_stat"] += rstats[i]["total"]["hit"];
			rstats[i]["base"]["avd_stat"]  = Math.floor( (100*11*Math.pow(rstats[i]["base"]["spd"], 0.90)/1000) + (100*Math.pow(rstats[i]["base"]["luk"], 0.96)/200) - 100 )
			rstats[i]["total"]["avd_stat"] = Math.floor( (100*11*Math.pow(rstats[i]["total"]["spd"], 0.90)/1000) + (100*Math.pow(rstats[i]["total"]["luk"], 0.96)/200) - 100 )
			if (rstats[i]["total"]["avd"]) rstats[i]["total"]["avd_stat"] += rstats[i]["total"]["avd"];
		}
	}
	return rstats;
}

// Assume all 3 jobs are at the same level
function get_unit_board_bonuses(unit_iname, job_level) {
	let bonuses = { "%":{}, "+":{} };
	let board = unitAbilityBoard.get(unit_iname);
	
	// For each panel
	board["panels"].forEach((panel) => {
		// If panel require a job lvl less or equal our parameter and is not a castable skill
		// Skill for damage max up, we handle it
		if (panel["need_level"] <= job_level && panel["panel_effect_type"] == 3) {
			// Look for the skill
			let skill_obj = skill.get(panel["value"]);
			if (!skill_obj["t_buffs"] || skill_obj["t_buffs"].length != 1) console.log("Unexpected t_buffs size != 1, panel "+panel["panel_id"]+" skill"+skill_obj.iname+" from "+unit_iname);
			// Look for the buff id in the panel
			let buff_id = skill_obj["t_buffs"][0];
			
			bonuses = sum_of_bonuses(bonuses, buff_id_to_stat(buff_id));
		}
		else if (panel["need_level"] <= job_level && panel["panel_effect_type"] != 1 && panel["panel_effect_type"] != 4) {
			let new_stats = buff_id_to_stat(panel["value"]);
			bonuses = sum_of_bonuses(bonuses, new_stats);
		}
	});
	
	return bonuses;
}

// input skill_id
// ouput array of buffs
function get_buffs_from_skill_id(skill_id) {
	let skill_obj = skill.get(skill_id);
	let arr1 = skill_obj["t_buffs"] ? skill_obj["t_buffs"] : [];
	let arr2 = skill_obj["s_buffs"] ? skill_obj["s_buffs"] : [];
	return arr1.concat(arr2);
}

function buff_id_to_stat(buff_id) {
	let result = {}
	let buff_obj = buff.get(buff_id);
	// For conditional and party wide buffs
	let conds = buff_obj["conds"];
	let continues = buff_obj["continues"];
	if (conds || continues) result["party"] = { "%":{}, "+":{} };
	// Safe net in case with have buff with conds != continues in the future
	if (buff_obj.conds && JSON.stringify(buff_obj.conds) != JSON.stringify(buff_obj.continues) ) {
		console.log("Not handled, conds != continues in buff "+buff_id);
	}
	if ( (conds && conds.length > 1) || (continues && continues.length > 1) ) {
		console.log("Not handled, conds or continues length > 1 in buff "+buff_id);
	}
	// Not handling size > 1 because lazy
	if (conds) conds = conds[0];
	if (continues) continues = continues[0];
	
	
	// As long as we find a buff effect type
	for (let i=1; buff_obj["type"+i] != null ; i++) {
		let type = buff_obj["type"+i]
		let calc = buff_obj["calc"+i]
		let tags = buff_obj["tag"+i]
		let valmax = buff_obj["val"+i+"1"]
		// Convert type integer to the stat string name
		let stat = typestat[type];
		// Add 'atk' to not use the same code for both resistance and atk
		if (calc <= 2 && type >= 42 && type <= 102) {
			stat = "atk"+stat;
		}
		// Special case Res all elements
		if (calc == 3 && type == 50) {
			for (let elem of ["ewi","eth","efi","eic","esh","eea","eda","ewa"]) {
				if (!result["+"]) result["+"] = {};
				if (!result["+"][elem]) result["+"][elem] = 0;
				result["+"][elem] += valmax;
			}
		}
		// Special case Res all attack types
		else if (calc == 3 && type == 60) {
			for (let elem of ["asl","api","abl","ash","ama"]) {
				if (!result["+"]) result["+"] = {};
				if (!result["+"][elem]) result["+"][elem] = 0;
				result["+"][elem] += valmax;
			}
		}
		// Element eater, Type killer, etc...
		else if (calc == 30) {
			tags.forEach((tag_id) => {
				if (!result["+"]) result["+"] = {};
				if (!result["+"]["kill"+tag_id]) result["+"]["kill"+tag_id] = 0;
				result["+"]["kill"+tag_id] += valmax;
				// Ease of use, store all kill type id existing in a Set (no duplicate)
				if (!result["kill"]) result["kill"] = new Set();
				result["kill"].add(tag_id);
			});
		}
		// Classic stat bonuses
		else if (calc <= 3) {
			if (!stat) console.log("Error "+buff_id+" typestat "+type+" is null (calc "+calc+")");
			let sign = (calc ==  2) ? "%" : "+";
			
			if (!result[sign]) result[sign] = {};
			if (!result[sign][stat]) result[sign][stat] = 0;
			result[sign][stat] += valmax;
			
			// Conditional party bonus, they're already applied in stats but we still save them somewhere
			if (conds) {
				if (!result["party"][sign][stat]) result["party"][sign][stat] = {};
				if (!result["party"][sign][stat][conds]) result["party"][sign][stat][conds] = {};
				if (!result["party"][sign][stat][conds][continues]) result["party"][sign][stat][conds][continues] = 0;
				
				result["party"][sign][stat][conds][continues] += valmax;
			}
		}
		else {
			console.log("Not yet handled: calc "+calc+", type "+type+" of buff "+buff_id);
		}
	}
	return result;
}

// Return the sum of 2 hash bonuses
function sum_of_bonuses(origin, new_stats) {
	if (new_stats["%"]) {
		Object.keys(new_stats["%"]).forEach((stat) => {
			if (!origin["%"][stat]) origin["%"][stat] = 0;
			origin["%"][stat] += new_stats["%"][stat];
		});
	}
	if (new_stats["+"]) {
		Object.keys(new_stats["+"]).forEach((stat) => {
			if (!origin["+"][stat]) origin["+"][stat] = 0;
			origin["+"][stat] += new_stats["+"][stat];
		});
	}
	// Conditional party bonus
	if (new_stats["party"]) {
		if (!origin["party"]) origin["party"] = { "%":{}, "+":{} };
		for (const sign in new_stats["party"]) {
			for (const stat in new_stats["party"][sign]) {
				if (!origin["party"][sign][stat]) origin["party"][sign][stat] = {};
				for (const conds in new_stats["party"][sign][stat]) {
					if (!origin["party"][sign][stat][conds]) origin["party"][sign][stat][conds] = {};
					for (const continues in new_stats["party"][sign][stat][conds]) {
						if (!origin["party"][sign][stat][conds][continues]) origin["party"][sign][stat][conds][continues] = 0;
						origin["party"][sign][stat][conds][continues] += new_stats["party"][sign][stat][conds][continues];
					}
				}
			}
		}
	}
	
	// To help with killxxx stats (element eater, type killer, etc...)
	if (new_stats["kill"]) {
		for (let tag_id of new_stats["kill"]) {
			if (!origin["kill"]) origin["kill"] = new Set();
			origin["kill"].add(tag_id);
		}
	}
	return origin;
}

// Sum of 2 "party" hashes which keep track of party bonuses
function sum_party_stats(origin, bonus) {
	if (!origin) origin = { "%":{}, "+":{} };
	for (const sign in bonus) {
		for (const stat in bonus[sign]) {
			if (!origin[sign][stat]) origin[sign][stat] = {};
			for (const conds in bonus[sign][stat]) {
				if (!origin[sign][stat][conds]) origin[sign][stat][conds] = {};
				for (const continues in bonus[sign][stat][conds]) {
					if (!origin[sign][stat][conds][continues]) origin[sign][stat][conds][continues] = 0;
					origin[sign][stat][conds][continues] += bonus[sign][stat][conds][continues];
				}
			}
		}
	}
	return origin
}

var stats_list = [
    "hp","mp","ap",
    "atk","mag","def","mnd","hit","avd",
    "dex","spd","luk","crt","crta","crtd","iniap",
    "mov","jmp","dmax",
    
    "atkasl","atkapi","atkabl","atkash","atkama",
    "asl","api","abl","ash","ama",
    
    "atkewi","atketh","atkefi","atkeic","atkesh","atkeea","atkeda","atkewa",
    "ewi","eth","efi","eic","esh","eea","eda","ewa",
    
    "atkcbl","atkcsl","atkcmu","atkcch","atkcdo","atkcst","atkcda","atkcbe","atkcpo","atkcpa",
    "atkccf","atkcfr","atkcpe","atkcdm","atkcsw",
    "cbl","csl","cmu","cch","cdo","cst","cda","cbe","cpo","cpa","ccf","cfr","cpe","cdm","csw",
    
    "unit_res", "aoe_res", "range",
    "hate", "skill_ct", "acquired_ap",
    "defpen", "sprpen", "apcostreduc", "slashrespen", "magicrespen",
    "healpow"
];

// translate a stat buff effect to its stat name
var typestat = []
typestat[1] = "hp"
typestat[2] = "mp"
typestat[3] = "ap"
typestat[21] = "atk"
typestat[22] = "def"
typestat[23] = "mag"
typestat[24] = "mnd"
typestat[25] = "dex"
typestat[26] = "spd"
typestat[27] = "luk"
typestat[28] = "mov"
typestat[29] = "jmp"
// used for resistance, prefix with 'atk' if calc 1
typestat[42] = "efi"
typestat[43] = "eic"
typestat[44] = "ewi"
typestat[45] = "eea"
typestat[46] = "eth"
typestat[47] = "ewa"
typestat[48] = "esh"
typestat[49] = "eda"
// used for resistance, prefix with 'atk' if calc 1
typestat[61] = "asl"
typestat[62] = "api"
typestat[63] = "abl"
typestat[64] = "ash"
typestat[65] = "ama"
// used for resistance, prefix with 'atk' if calc 1
typestat[84] = "cpo"
typestat[85] = "cbl"
typestat[86] = "csl"
typestat[87] = "cmu"
typestat[88] = "cpa"
typestat[89] = "ccf"
typestat[90] = "cch"
typestat[91] = "cpe"
typestat[92] = "cfr"
typestat[96] = "csw"
typestat[97] = "cst"
typestat[99] = "cdm"
typestat[100] = "cda"
typestat[101] = "cbe"
typestat[102] = "cdo"

typestat[151] = "iniap"
typestat[152] = "range"
typestat[155] = "hit"
typestat[156] = "avd"
typestat[157] = "crtd"
typestat[158] = "crt"
typestat[159] = "crta"

typestat[180] = "hate"
typestat[183] = "skill_ct" //Skill CT Req
typestat[184] = "activ_time" // "Decrease Activation Time"
typestat[190] = "acquired_ap" // Acquired AP
typestat[312] = "dmax" // Max damage

typestat[310] = "unit_res"
typestat[311] = "aoe_res"

typestat[314] = "defpen" // "Def Penetration"
typestat[316] = "apcostreduc" // "AP Cost Reduction"
typestat[319] = "sprpen"

typestat[321] = "slashrespen" // "Slash Res Pen"
typestat[329] = "magicrespen" // "Magic Res Pen"
typestat[347] = "healpow" // "Healing Power"