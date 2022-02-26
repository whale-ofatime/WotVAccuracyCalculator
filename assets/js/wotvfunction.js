// Functions for WOTV-related data parsing/calculation
// Ensure that helper.js is called with the .html file where these methods are used

async function getUnitLevelStats(unit_iname) {
    let promise = await new Promise((resolve, reject) => { 
        let unitPromise = loadJSONPromise('./assets/dump/data/Unit.json');
        let jobPromise = loadJSONPromise('./assets/dump/data/Job.json');
        let unitAbilityBoardPromise = loadJSONPromise('./assets/dump/data/UnitAbilityBoard.json');
        let buffPromise = loadJSONPromise('./assets/dump/data/Buff.json');
        let skillPromise = loadJSONPromise('./assets/dump/data/Skill.json');
        let promiseList = [unitPromise, jobPromise, unitAbilityBoardPromise, buffPromise, skillPromise];
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

async function getVisionCardLevelStats(vc_iname) {
	let promise = await new Promise((resolve, reject) => { 
        let visionCardPromise = loadJSONPromise('./assets/dump/data/VisionCard.json');
		let visionCardNamePromise = loadJSONPromise('./assets/dump/en/VisionCardName.json');
		let buffPromise = loadJSONPromise('./assets/dump/data/Buff.json');
        let skillPromise = loadJSONPromise('./assets/dump/data/Skill.json');
		let growPromise = loadJSONPromise('./assets/dump/data/Grow.json');
		let visionCardLimitedConditionPromise = loadJSONPromise('./assets/dump/data/VisionCardLimitedCondition.json');
		let unitNamePromise = loadJSONPromise('./assets/dump/en/UnitName.json');
		let jobNamePromise = loadJSONPromise('./assets/dump/en/JobName.json');
        let promiseList = [visionCardPromise, buffPromise, skillPromise, growPromise, visionCardLimitedConditionPromise, unitNamePromise, jobNamePromise, visionCardNamePromise];
        Promise.all(promiseList).then((values) => {
			visionCard = parse_AnyData(values[0],"iname");
			buff = parse_AnyData(values[1],"iname");
			skill = parse_AnyData(values[2],"iname");
			grow = parse_AnyData(values[3],"type");
			visionCardLimitedCondition = parse_AnyData(values[4],"iname");
			unitName = parse_AnyName(values[5]);
			jobName = parse_AnyName(values[6]);
			visionCardName = parse_AnyName(values[7]);
			
			data = get_vc_stats(vc_iname)
            resolve(data);
        });
    }).catch(err => console.log(err));

    return promise;
}

//-----------------------------------------------------------------------------------
// Credit to Krazplay at https://github.com/Krazplay/wotv for the following functions

function quicktest_add_jp_names(mapName) {
	if (mapName["UN_LW_P_MONT"]) {
		mapName["UN_LW_P_LILS_01"] = mapName["UN_LW_P_LILS_01"] || "Lilyth Swimsuit (JP)"
		mapName["UN_LW_P_KTON_01"] = mapName["UN_LW_P_KTON_01"] || "Kitton Swimsuit (JP)"
		mapName["UN_NIER_P_N2TB"] = mapName["UN_NIER_P_N2TB"] || "2B (JP)"
		mapName["UN_NIER_P_N9TS"] = mapName["UN_NIER_P_N9TS"] || "9S (JP)"
		mapName["UN_LW_P_MONT_01"] = mapName["UN_LW_P_MONT_01"] || "King Mont (JP)"
		mapName["UN_LW_P_RYEL"] = mapName["UN_LW_P_RYEL"] || "Ruel/Louelle (JP)"
		mapName["UN_LW_P_SIRM"] = mapName["UN_LW_P_SIRM"] || "Sylma? (JP)"
		mapName["UN_LW_P_HLNA_01"] = mapName["UN_LW_P_HLNA_01"] || "Helena Black Witch (JP)"
		mapName["UN_LW_P_THLA_01"] = mapName["UN_LW_P_THLA_01"] || "Salire Valentine (JP)"
		mapName["UN_LW_P_CMLO"] = mapName["UN_LW_P_CMLO"] || "Camillo (JP)"
		mapName["UN_LW_P_MORE"] = mapName["UN_LW_P_MORE"] || "Moore (JP)"
		mapName["UN_LW_P_CWEL"] = mapName["UN_LW_P_CWEL"] || "Cowell (JP)"
		mapName["UN_LW_P_CRLT"] = mapName["UN_LW_P_CRLT"] || "Charlotte (JP)";
	}
}

/*
	The iname is not always enough to have a unique identifier, a second parameter may be needed to create a unique key
	example: adventureAreaDropDeck, you have one object per iname per campaign, iname is not unique
	Return a Map, so use .get(key)
*/
function parse_AnyData(data, iname, iname2 = null) {
	let mapData = new Map();
	data.items.forEach((item) => {
		mapData.set(iname2 ? item[iname]+item[iname2] : item[iname], item);
	});
	return mapData;
}

/*
	Parse a json file from folder 'en', the key parameter value become the key in the result
	ex unitName["UN_LW_P_MONT"] => {"key"=>"UN_LW_P_MONT", "value"=>"Mont Leonis"}
*/
function parse_AnyName(data) {
	let mapName = {};
	data.infos.forEach((info) => {
		if (info.value) mapName[info.key] = info.value;
	});
	quicktest_add_jp_names(mapName);
	return mapName;
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

// Modified from get_datatable_VisionCard()
function get_vc_stats(vc_iname) {
	let tmaxlvl =  [30, 40, 60, 70, 99]

	// result = [];
	let object = visionCard.get(vc_iname);
	let rstats = {};

	rstats["iname"] = object.iname;
	rstats["name"] = visionCardName[object.iname] ? visionCardName[object.iname] : object.iname;
	rstats["rare"] = rareName[object.rare];
	rstats["cost"] = object.cost;

	// Always get maxed VC stats
	let maxed = 1;
	let awk = 4
	rstats["lvl"] = tmaxlvl[object.rare];

	visions_stats_list.forEach((stat) => {
		// if stat is presend in card stats
		if (object["status"] && object["status"][0][stat] != null) {
			rstats[stat] = object["status"][1][stat]
		}
		else rstats[stat] = "";
	});
	
	// Party skills buffs
	rstats["PartyBuffs"] = "";
	rstats["CondPartyBuffs"] = "";
	object.card_buffs.forEach((bonus_group) => {
		let cnds_iname = bonus_group["cnds_iname"];
		let card_skill = skill.get(bonus_group["card_skill"]);
		let add_card_skill_buff_awake = skill.get(bonus_group["add_card_skill_buff_awake"]);
		let add_card_skill_buff_lvmax = skill.get(bonus_group["add_card_skill_buff_lvmax"]);
		
		let buff1 = get_skill_buff_at_level(card_skill, rstats["lvl"]);
		let buff2 = get_skill_buff_at_level(add_card_skill_buff_awake, awk);
		let buff3 = get_skill_buff_at_level(add_card_skill_buff_lvmax, maxed);
		buff1 = fuse_buffs(buff1, buff2);
		buff1 = fuse_buffs(buff1, buff3);
		rstats["PartyRawBuff"] = buff1;
		if (cnds_iname) {
			// I don't want to show elem condition because the cond is also present in the buff
			let condition = visionCardLimitedCondition.get(cnds_iname);
			if (condition["elem"] && Object.keys(condition).length) rstats["CondPartyBuffs"] += buff_to_txt(buff1);
			else rstats["CondPartyBuffs"] += vc_cond_to_txt(cnds_iname)+"{ "+buff_to_txt(buff1)+" }<br/>";
		}
		else rstats["PartyBuffs"] += buff_to_txt(buff1);
	});
	// Self skills buffs
	rstats["SelfBuffs"] = "";
	rstats["CondSelfBuffs"] = "";
	rstats["CastSkill"] = "";
	object.self_buffs.forEach((bonus_group) => {
		let buff_cond = bonus_group["buff_cond"];
		let self_buff = skill.get(bonus_group["self_buff"]);
		let add_self_buff_awake = skill.get(bonus_group["add_self_buff_awake"]);
		let add_self_buff_lvmax = skill.get(bonus_group["add_self_buff_lvmax"]);
		
		if (self_buff.slot == 1) {
			rstats["CastSkill"] += "todo";
			//todo, manage castable skills
		}
		else {
			let buff1 = get_skill_buff_at_level(self_buff, rstats["lvl"]);
			let buff2 = get_skill_buff_at_level(add_self_buff_awake, awk);
			let buff3 = get_skill_buff_at_level(add_self_buff_lvmax, maxed);
			buff1 = fuse_buffs(buff1, buff2);
			buff1 = fuse_buffs(buff1, buff3);
			rstats["SelfRawBuff"] = buff1;
			if (buff_cond) {
				// I don't want to show elem condition because the cond is also present in the buff
				let condition = visionCardLimitedCondition.get(buff_cond);
				if (condition["elem"] && Object.keys(condition).length) rstats["CondSelfBuffs"] += buff_to_txt(buff1);
				else rstats["CondSelfBuffs"] += vc_cond_to_txt(buff_cond)+"{ "+buff_to_txt(buff1)+" }<br/>";
			}
			else rstats["SelfBuffs"] += buff_to_txt(buff1);
		}
	});
	return rstats
	// result.push(line);

		

		// for (let awk=0; awk<5; awk++) {
		// 	// Clone the existing line
		// 	let line_2 = Object.assign({}, line);
		// 	let lvl_todo = tlvlawa[object.rare][awk]-1;
		// 	let lvl_max = tmaxlvl[object.rare]-1;
		// 	let maxed = awk == 4 ? 1 : 0;
		// 	line_2["awk"] = awk;
		// 	line_2["lvl"] = lvl_todo+1;
		// 	visions_stats_list.forEach((stat) => {
		// 		// if stat is presend in card stats
		// 		if (object["status"] && object["status"][0][stat] != null) {
		// 			let lv1_stat = object["status"][0][stat]
		// 			let max_stat = object["status"][1][stat]
		// 			line_2[stat] = Math.floor(lv1_stat + ( (max_stat-lv1_stat) * lvl_todo / lvl_max ));
		// 		}
		// 		else line_2[stat] = "";
		// 	});
		// 	// Party skills buffs
		// 	line_2["PartyBuffs"] = "";
		// 	line_2["CondPartyBuffs"] = "";
		// 	object.card_buffs.forEach((bonus_group) => {
		// 		let cnds_iname = bonus_group["cnds_iname"];
		// 		let card_skill = skill.get(bonus_group["card_skill"]);
		// 		let add_card_skill_buff_awake = skill.get(bonus_group["add_card_skill_buff_awake"]);
		// 		let add_card_skill_buff_lvmax = skill.get(bonus_group["add_card_skill_buff_lvmax"]);
				
		// 		let buff1 = get_skill_buff_at_level(card_skill, line_2["lvl"]);
		// 		if (awk > 0) {
		// 			let buff2 = get_skill_buff_at_level(add_card_skill_buff_awake, awk);
		// 			buff1 = fuse_buffs(buff1, buff2);
		// 		}
		// 		if (awk == 4) {
		// 			let buff3 = get_skill_buff_at_level(add_card_skill_buff_lvmax, maxed);
		// 			buff1 = fuse_buffs(buff1, buff3);
		// 		}
				
		// 		if (cnds_iname) {
		// 			// I don't want to show elem condition because the cond is also present in the buff
		// 			let condition = visionCardLimitedCondition.get(cnds_iname);
		// 			if (condition["elem"] && Object.keys(condition).length) line_2["CondPartyBuffs"] += buff_to_txt(buff1);
		// 			else line_2["CondPartyBuffs"] += vc_cond_to_txt(cnds_iname)+"{ "+buff_to_txt(buff1)+" }<br/>";
		// 		}
		// 		else line_2["PartyBuffs"] += buff_to_txt(buff1);
		// 	});
		// 	// Self skills buffs
		// 	line_2["SelfBuffs"] = "";
		// 	line_2["CondSelfBuffs"] = "";
		// 	line_2["CastSkill"] = "";
		// 	object.self_buffs.forEach((bonus_group) => {
		// 		let buff_cond = bonus_group["buff_cond"];
		// 		let self_buff = skill.get(bonus_group["self_buff"]);
		// 		let add_self_buff_awake = skill.get(bonus_group["add_self_buff_awake"]);
		// 		let add_self_buff_lvmax = skill.get(bonus_group["add_self_buff_lvmax"]);
				
		// 		if (self_buff.slot == 1) {
		// 			line_2["CastSkill"] += "todo";
		// 			//todo, manage castable skills
		// 		}
		// 		else {
		// 			let buff1 = get_skill_buff_at_level(self_buff, line_2["lvl"]);
		// 			if (awk > 0) {
		// 				let buff2 = get_skill_buff_at_level(add_self_buff_awake, awk);
		// 				buff1 = fuse_buffs(buff1, buff2);
		// 			}
		// 			if (awk == 4) {
		// 				let buff3 = get_skill_buff_at_level(add_self_buff_lvmax, maxed);
		// 				buff1 = fuse_buffs(buff1, buff3);
		// 			}
					
		// 			if (buff_cond) {
		// 				// I don't want to show elem condition because the cond is also present in the buff
		// 				let condition = visionCardLimitedCondition.get(buff_cond);
		// 				if (condition["elem"] && Object.keys(condition).length) line_2["CondSelfBuffs"] += buff_to_txt(buff1);
		// 				else line_2["CondSelfBuffs"] += vc_cond_to_txt(buff_cond)+"{ "+buff_to_txt(buff1)+" }<br/>";
		// 			}
		// 			else line_2["SelfBuffs"] += buff_to_txt(buff1);
		// 		}
		// 	});
		// 	result.push(line_2);
		// }
	// return result;
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

/*
	Input skill object and skill level
	Assume there is only one buff
	Return a buff object
*/
function get_skill_buff_at_level(skill_obj, skill_lvl) {
	if (skill_obj == null) return null;
	// Little check, currently all vc skills have only one buff
	let t_length = skill_obj["t_buffs"] ? skill_obj["t_buffs"].length : 0
	let s_length = skill_obj["s_buffs"] ? skill_obj["s_buffs"].length : 0
	if (t_length + s_length != 1) console.log("Error: buffs length != 1 in "+skill_obj.iname);
	// Get the buff id from either t_buff or s_buff
	let buff_id = t_length > 0 ? skill_obj.t_buffs[0] : skill_obj.s_buffs[0];
	// Clone the buff, we're going to modify it
	let buff_result = Object.assign({}, buff.get(buff_id));
	// The maxed vc skills have no grow, they're simply acquired when you reach max, so 1/1 will give full bonus
	let skill_grow = grow.get(skill_obj["grow"]);
	let start_lvl = skill_grow ? skill_grow["curve"][0]["val"] : 0;
	let lvl_max = skill_grow ? skill_grow["curve"][0]["lv"] : 1;
	
	// Loop as long as we find valid typeX in the buff params
	for (let i=1; buff_result["type"+i] != null ; i++) {
		let base_val = buff_result["val"+i];
		let max_gain = buff_result["val"+i+"1"] - buff_result["val"+i];
		
		// Modifying min/max value to current value so we can print the buff later
		// todo add ceil for negative values
		buff_result["val"+i] = Math.floor( base_val + ( max_gain * (skill_lvl-start_lvl) / (lvl_max-start_lvl) ) );
		buff_result["val"+i+"1"] = Math.floor( base_val + ( max_gain * (skill_lvl-start_lvl) / (lvl_max-start_lvl) ) );
	}
	
	return buff_result;
}

function buff_to_txt(buff_obj) {
	let result = ""
	// Conditions for all buff effects
	let conds_text = "";
	//if (buff_obj["conds"]) result += "[conds:"+buff_obj["conds"]+"]"
	//if (buff_obj["continues"]) result += "[continues:"+buff_obj["continues"]+"]"
	
	if (buff_obj["conds"]) {
		buff_obj["conds"].forEach((elem_id) => {
			conds_text += typetxt[31+elem_id]+", ";
		});
		conds_text = conds_text.slice(0,-2); // remove last ", "
	}
	// Buff effects
	for (let i=1; buff_obj["type"+i] != null ; i++) {
		result += effect_to_txt(buff_obj, i);
		result += ", ";
	}
	result = result.slice(0,-2);
	if (conds_text != "") result = conds_text+"{ "+result+" }";
	return result;
}

function effect_to_txt(buff_obj, nb) {
	let output = ""
	let type = buff_obj["type"+nb]
	let calc = buff_obj["calc"+nb]
	let tags = buff_obj["tag"+nb]
	let valmin = buff_obj["val"+nb]
	let valmax = buff_obj["val"+nb+"1"]
	
	let type_str = typetxt[type];
	if (type_str == null) console.log("No text found for type "+type+" in buff "+buff_obj.iname);
    // val: no need to show min and max if identical, add + if value is positive (Slash +15 instead of Slash 15)
	let val_str = null
	let val_str_no_plus = null // alternative without adding the +
    if (valmin !== null) {
      if (valmin == valmax) val_str_no_plus = valmin;
      else val_str_no_plus = `${valmin}/${valmax}`;
	  val_str = (valmin >= 0) ? "+"+val_str_no_plus : val_str_no_plus;
    }
	// tags
	let tags_str = null;
	if (tags) {
		tags_str = ""
		tags.forEach((tag) => {
			if (tagtxt[tag]) tags_str += `${tagtxt[tag]}+`;
			else { tags_str += `Tag${tag}+`; console.log(`Tag ${tag} inconnu buff ${buff_obj["iname"]}`) }
		});
		tags_str = tags_str.slice(0,-1); // remove last +
	}
	
	if (calc == 1) {
		// calc 1 is usualy a flat bonus
		if (tags_str) output += `${tags_str} `;
		output += `${type_str}${val_str}`;
	} else if (calc == 2) {
		// calc 2 is usualy a % bonus
		if (tags_str) output += `${tags_str} `;
		output += `${type_str}${val_str}%`;
	} else if (calc == 3) {
		// calc 3 is used for resistance bonuses
		if (tags_str) output += `${tags_str} `;
		output += `${type_str} Res ${val_str}%`;
	} else if (calc == 11 && (type == 1 || type == 2 || type == 3)) {
		// calc 11 type 1/2/3 => Restore X% of your HP/AP/TP
		let rstat = [null, "HP", "TP", "AP"];
		output += "Restore "+val_str_no_plus+"% "+rstat[type]
		// useless
		if (buff_obj["rate"] && buff_obj["rate"] != 200) output += ` (acc:${buff_obj["rate"]}%∑Faith)`;
	} else if (calc == 11 && type == 103) {	
		// calc 11 type 103 => Revive
		output += "Revive with "+val_str+"% HP (acc:"+buff_obj["rate"]+"% ∑Faith)";
	} else if (calc == 12) {
		// calc 12 recover hp (multiplier)
		output += "Heal "+val_str+"%*Pow "+type_str;
	} else if (calc == 30 && type == 123) {
		// calc 30 inflict another buff if type = 123, buff_id inflicted is in param id1
		output += "Inflict ";
		let buff_obj2 = buff.get(buff_obj["id1"]);
		output += buff_to_txt(buff_obj2);
	} else if (calc == 30 || calc == 21) {
		// calc 30 inflict status, calc 21 inflict poison
		if (tags_str) output += `${tags_str} `;
		output += `${type_str}`;
		let parenthese = "";
		// rate = 200 mean it can't miss so I don't show the accuracy (minimum faith is 30, and 200%*(30+30)=120)
		if (buff_obj["rate"] && buff_obj["rate"] != 200) parenthese += `acc:${buff_obj["rate"]}%∑Faith, `;
		if (buff_obj["turn"]) parenthese += `${buff_obj["turn"]} turns, `;
		if (val_str) parenthese += `effect:${val_str}, `;
		if (parenthese != "") {
			parenthese = parenthese.slice(0,-2); // cut last ", "
			output += " (" + parenthese + ")";
		}
	} else if (calc == 31) {
		// calc 31 status purification
		if (buff_obj["rate"] && buff_obj["rate"] != 200) output += `${buff_obj["rate"]}%∑Faith `;
		output += `Cure ${type_str}`;
	} else if (calc == 40) {	
		// calc 40 status is nullified for X turns
		if (buff_obj["rate"] && buff_obj["rate"] != 200) output += `${buff_obj["rate"]}%∑Faith `;
		output += `Nullify ${type_str} for ${buff_obj["turn"]} turns`;
	} else {
		output = "Not parsed";
		console.log(`Not parsed: Calc ${calc} Type ${type} (${buff_obj["iname"]})`);
	}
	
	// For esper table only, the sp cost has been added to the buff
	// if (buff_obj["sp"]) output += ` (${buff_obj["sp"]}sp)`; // Removed
	
	return output;
}

/*
	Two Buffs Enter, One Buff Leaves
	Buff 2 effect exist in Buff 1: values are added
	Else the effect is added in the first available slot in Buff 1
	Buff 1 is returned
*/
function fuse_buffs(buff1, buff2) {
	if (buff2 == null) return buff1;
	//todo check all buffs param
	// Loop as long as we find valid typeX in buff2 params
	for (let i=1; buff2["type"+i] != null ; i++) {
		// Loop on existing buff effects in buff1
		for (let j=1; buff1["type"+j] != null ; j++) {
			// Params to match
			if (buff2["type"+i] == buff1["type"+j] && buff2["calc"+i] == buff1["calc"+j] && JSON.stringify(buff2["tag"+i]) == JSON.stringify(buff1["tag"+j])) {
				buff1["val"+j] += buff2["val"+i];
				buff1["val"+j+"1"] += buff2["val"+i+"1"];
				break;
			}
		}
	}
	
	return buff1;
}

// require visionCardLimitedCondition
function vc_cond_to_txt(condition_id) {
	let condition = visionCardLimitedCondition.get(condition_id);
	if (condition == null) {
		console.log("Could not find visionCardLimitedCondition "+condition_id);
		return "";
	}
	let result = "";
	if (condition["elem"]) {
		condition["elem"].forEach((elem_id) => {
			result += typetxt[41+elem_id]+", ";
		});
		result = result.slice(0,-2); // remove last ", "
	}
	
	if (condition["mainjobs"]) {
		condition["mainjobs"].forEach((job_id) => {
			result += jobName[job_id]+", ";
		});
		result = result.slice(0,-2); // remove last ", "
	}
	
	if (condition["units"]) {
		condition["units"].forEach((unit_id) => {
			result += unitName[unit_id]+", ";
		});
		result = result.slice(0,-2); // remove last ", "
	}
	if (result == "") console.log("vc_cond_to_txt returns empty for visionCardLimitedCondition "+condition_id);
	return (result != "") ? result : condition_id;
}

function union(setA, setB) {
    let _union = new Set(setA)
    for (let elem of setB) {
        _union.add(elem)
    }
    return _union
}

const rareName = ["N","R","SR","MR","UR"];

let stats_list = [
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

const visions_stats_list = [
	"hp","mp","ap",
	"atk","mag","def","mnd","hit","avd",
	"dex","spd","luk","crt","crta"
	];

// translate a stat buff effect to its stat name
let typestat = []
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

let typetxt = []
typetxt[1] = "HP"
typetxt[2] = "TP"
typetxt[3] = "AP"
typetxt[4] = "CT"
typetxt[21] = "ATK"
typetxt[22] = "DEF"
typetxt[23] = "MAG"
typetxt[24] = "SPR"
typetxt[25] = "DEX"
typetxt[26] = "AGI"
typetxt[27] = "LUCK"
typetxt[28] = "Move"
typetxt[29] = "Jump"
typetxt[41] = "None" // Elmt for No elmt (Odin, Bahamut...)
typetxt[42] = "Fire"
typetxt[43] = "Ice"
typetxt[44] = "Wind"
typetxt[45] = "Earth"
typetxt[46] = "Lightning"
typetxt[47] = "Water"
typetxt[48] = "Light"
typetxt[49] = "Dark"
typetxt[50] = "All Elements"
typetxt[60] = "All Attack Types"
typetxt[61] = "Slash"
typetxt[62] = "Pierce"
typetxt[63] = "Strike"
typetxt[64] = "Missile"
typetxt[65] = "Magic"
typetxt[81] = "Regen"
typetxt[84] = "Poison"
typetxt[85] = "Blind"
typetxt[86] = "Sleep"
typetxt[87] = "Silence"
typetxt[88] = "Paralysis"
typetxt[89] = "Confusion"
typetxt[90] = "Charm"
typetxt[91] = "Petrify"
typetxt[92] = "Toad"
typetxt[95] = "Haste"
typetxt[96] = "Slow"
typetxt[97] = "Stop"
typetxt[98] = "Stun"
typetxt[99] = "Immobilize"
typetxt[100] = "Disable"
typetxt[101] = "Berserk"
typetxt[102] = "Doom"
typetxt[103] = "Revive"
typetxt[105] = "Protect"
typetxt[106] = "Shell"
typetxt[110] = "Float"
typetxt[112] = "Quicken"
typetxt[113] = "Survive a fatal hit"
typetxt[114] = "Evade Physical hit"
typetxt[115] = "Evade Magical hit"
//typetxt[116] = "Conditional buff" special, va de pair avec le paramètre conds ?
typetxt[117] = "Next hit is Crit"
typetxt[119] = "" // Element Eater, require a tag
typetxt[120] = "" // Type Killer, require a tag
typetxt[121] = "" // Race Killer?, require a tag
typetxt[122] = "" // Type Killer - Cette version est uniquement sur les 3 Master Ability
typetxt[123] = "Proc buff" // proc another buff param id1
typetxt[124] = "CT Up/Down"
typetxt[126] = "with physical attack"
typetxt[130] = "with magic attack"
typetxt[134] = "Flat Dmg" // Flat Damage Type Killer
typetxt[140] = "Poison, Blind, Sleep, Silence, Paralysis, Confusion, Petrify, Toad, Immobilize, Disable, Berserk, Stun" // Esuna
typetxt[142] = "All buffs" // Dispel Counter, Erase
typetxt[144] = "Male Killer?"
typetxt[151] = "Initial AP"
typetxt[152] = "Range"
typetxt[155] = "ACC"
typetxt[156] = "EVA"
typetxt[157] = "Crit Dmg"
typetxt[158] = "CRIT"
typetxt[159] = "CRIT EVA"
typetxt[180] = "Hate"
typetxt[181] = "Brave"
typetxt[182] = "Faith"
typetxt[183] = "Skill CT Req"
typetxt[184] = "Activation CT Req"
typetxt[190] = "Acquired AP"
typetxt[191] = "Evoc Gauge Boost"
typetxt[192] = "Brave (temp)"
typetxt[193] = "Faith (temp)"
typetxt[194] = "Acquired JP"
typetxt[200] = "Debuff Res"
typetxt[202] = "ATK debuff Res"
typetxt[203] = "DEF debuff Res"
typetxt[300] = "Self-cast Buff duration"
typetxt[301] = "Self-cast Debuff duration"
typetxt[310] = "Unit Attack Res"
typetxt[311] = "AoE Attack Res"
typetxt[312] = "Max Damage"
typetxt[313] = "Evocation" // Evocation magic for esper, no one cares if I remove magic (annoying for filtering)
typetxt[314] = "Def Penetration"
typetxt[316] = "AP Cost Reduction"
typetxt[319] = "Spr Penetration"
typetxt[321] = "Slash Res Pen"
typetxt[329] = "Magic Res Pen"
typetxt[347] = "Healing Power"

//todo recheck killers
let tagtxt = []
tagtxt[2] = "Fire Eater"
tagtxt[3] = "Ice Eater"
tagtxt[4] = "Wind Eater"
tagtxt[5] = "Earth Eater"
tagtxt[6] = "Lightning Eater"
tagtxt[7] = "Water Eater"
tagtxt[8] = "Light Eater"
tagtxt[9] = "Dark Eater"
tagtxt[101] = "Man Eater"
tagtxt[102] = "Esper Eater"
tagtxt[103] = "Beast Killer"
tagtxt[104] = "Demon Killer"
tagtxt[105] = "Dragon Killer"
tagtxt[106] = "Plantoid Killer"
tagtxt[107] = "Avian Killer"
tagtxt[109] = "Aquatic Killer"
tagtxt[110] = "Machine Killer"
tagtxt[111] = "Spirit Killer"
tagtxt[112] = "Reaper Killer"
tagtxt[113] = "Stone Killer"
tagtxt[114] = "Metal Killer"
tagtxt[115] = "Magical Creature? Killer"
tagtxt[204] = "Fennes Killer"