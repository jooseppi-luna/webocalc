/******
April 5,2005
webocalc.js
goes with new version of webocalc, started April 2005

This version 0.3.1
Dec 30, 2005

Jan 25, 2006:
Modified prop power absorbed using numerical coeffs I worked out for Powercalc,
my motor/prop modelling program.

Algorithm for choosing props completely re-written. This version steps through reasonable
propeller diameters, and using the desired pitch speed, calculates the rpm at which that prop would
need to turn to absorb the available power. The pitch is then calculated from the rpm and pitch speed.
Then this pitch is rounded to the nearest inch, and if the resulting pitch change is no more than 20% 
of the original pitch, the result is printed.

Algorithm improved further: once the pitch is rounded off to the nearest inch as described above, the
rpm at which this new prop (with the newly rounded pitch) must turn to absorb the available power is 
recalculated. Then the resulting new pitch speed is also recalculated. Now data for my benchmark, an
APC 12x8 prop at 6150 rpm, is spot-on. :)
(Benchmark data by ProtoPlane, RC Groups: E-flite Park 480, Kv 1080, Rm = 0.1385 ohm, Io = 1.1 A,
APC 12x8 TE prop, 9.52 V, 27.6 A, 6150 rpm.

Jan 30, 2006
Modified prop power absorbed equation yet again, based on Martyn Mckinney's RC Groups post about
the Abbott equations:
Pwr(W) = P(in) D(in)^4 RPM^3 x 5.33e-15
Thrust(Oz)= P(in) D(in)^3 RPM^2 1.0e-10

Modified prop_object to include the predicted thrust, and moved the thrust calculation into the function
that finds prop sizes (find_prop_size_v2())

Jan 31, 2006
Wrote new function, find_max_thrust, to find the best thrust from all the available
propellers in prop_list, and use that prop to make the power predictions.

Feb 5, 2006
Corrected find_prop_size algorithm to allow for high P/D props being stalled when static -
first find approx prop, then tweak pitch to nearest inch, then check if stalled and find
effective pitch if so, then find rpm at which prop with this effective pitch absorbs available power,
then find thrust and pitch speed at that new rpm.

July 21, 2006
Version 0.7.1

Started significant re-write; this time, pitch speed will be suggested by webocalc, but the user can supply a value instead. This will make WebOCalc more flexible than it is at present.
Updated function check_if_number() to check for digits and decimal points only.

wrote new functions read_airframe_data(), suggest_pitch_speed(), calculate_stall_speed(), and cleaned up
some other code.

???, 2006
Versions 0.7.1 - 0.7.7
Slight incremental changes. Last change: user can see motor efficiency in drop-down motor selection list.

Dec 20, 2006
Noticed thrust was not being suitably limited for props with pitch > 0.65 of diameter. Fixed.

Jan 16, 2007
Used Martyn Mckinney's measured prop data to arrive at Cp_apc_te = 1.013 (average of 23 APC TE props),
and Cp_apc_sf = 1.15 (avg of 10 APC SF props).

Changed "Gear ratio" message to "Approx Gear Ratio".

Changed recommended pitch speed to 2.75 times stall speed (was 2.5 times stall speed)

Added more sub-categories of warning messages if inadequate pitch speed is specified by user.

Jan 17, 2007
Modified code so after prop pitch is rounded off to nearest inch, prop rpm is recomputed (based on input power).
Then the new rpm is used to calculate pitch speed and thrust.

Wrote function prop_effective_pitch() to compute effective pitch of props with large P/D ratios.

Jan 17 - 28, 2007
Considerable code clean-ups. Wrote new prop finder function; wrote function to initialise colour of HTML table cells,
wrote function to clean up printout of prop results.

Jan 28, 2007
Inserted tables of APC TE and SF prop sizes and prop constants, data from Martyn Mckinney. Next step: use these tables
when searching for prop sizes.


June 6, 2008
Version 0.9.3 in progress
Added APC 10x10 ¨E¨ prop to prop list

Apr 2009
Currently at version 1.05. 
Many changes - pitch speed, thrust, prop size, battery type and cell count, current draw all now have "wizards" to help 
the user quickly find suitable values.

Ongoing changes to detect correct number of A123 cells in power_wizard() function.

Nov 2009
Current release version 1.5
Ver 1.6.in_progress contains numerous minor tweaks; not released yet.
Ver 1.7 - replace static HTML in 2nd and 3rd main cells with dynamically written ones. This will allow help tips to be displayed when
hovering over each data entry field, allow a "go direct drive" checkbox next to each suggested prop, etc.

June 2012
Webocalc version 1.7.4
Clean-ups to interface. Ask user for flight duration. Clarify battery selection process.
*********/
//Put global variables here...these values should remain consistent through the entire code
	V_nimh_cell = 1.2;	//volts per nimh cell under load
	V_A123_cell = 2.8;	//volts per A123 cell under load
	K_nimh = 4.32;		//joules per nimh cell per mAh using 93% discharge. Calculated based on 1.2 V average voltage.
	K_A123 = 10.26;		//joules per A123 cell per mAh using 95% discharge. Calculated based on 3.0 V average voltage.
	w_A123 = 75.0;		//75 grams per 2300 mAh A123 cell.
	A123_pout_max = 120.0;	//maximum watts that can be supplied by a 2300 mAh A123 cell
/*-------------------------------------------------*/
function check_if_number(myDoc,elt,eltname){
//modified Aug 2nd, 2008 to allow reference to "document" or "parent.document" using "myDoc" parameter passed to function.
	if(!myDoc){
		myDoc = this.parent.document;
	}
	var boxval = myDoc.getElementById(elt).value;
	var auw = parseFloat(boxval);
	myDoc.getElementById(elt).style.borderStyle = "solid";
	myDoc.getElementById(elt).style.borderWidth = "2px";
	myDoc.getElementById(elt).style.borderTopColor = "#888888";
	myDoc.getElementById(elt).style.borderLeftColor = "#888888";
	myDoc.getElementById(elt).style.borderBottomColor = "#eeeeee";
	myDoc.getElementById(elt).style.borderRightColor = "#eeeeee";
	myDoc.getElementById(elt).style.backgroundColor = "#ffffff"; /*restore background to white */
	myDoc.getElementById(elt).style.color = "#000000";
	var errorflag = 0;
	var errormsg = "";
	var illegalChars = /[^0-9.]/;

	if (illegalChars.test(boxval)) {    // allow only letters, numbers, and underscores
		errormsg = eltname + " should only contain the digits 0-9!\n";
		errorflag = 1;
	}else if( boxval == ""){
		errormsg = "You left " + eltname + " blank - please correct this!\n";
		errorflag = 1;
	}else if(isNaN(auw)){
		errormsg = eltname + " should be a number! Please correct it.\n";
		errorflag = 1;
	}

	if(errorflag){
	/*  document.getElementById('auw').style.backgroundColor = "#ffdd99"; */
		alert(errormsg);
		myDoc.getElementById(elt).style.borderStyle = "dotted";
		myDoc.getElementById(elt).style.borderWidth = "2px";
		myDoc.getElementById(elt).style.borderColor = "#ff0000";
		myDoc.getElementById(elt).style.backgroundColor = "#ffff88";
		myDoc.getElementById(elt).style.color = "#ff0000";  /*text color */
/*		document.getElementById(elt).value = ""; */
/*		document.getElementById(elt).focus(); *//*this lead to endless error messages with no ability to type into the textboxes!*/
		return 1;
	}else{
		return 0;
	}
}
/*-------------------------------------------------*/
function check_if_number1(elt)
{
	/* alert("in check_if_number, par = " + elt); */
	var boxval = document.getElementById(elt).value;
	var auw = parseFloat(boxval);
	document.getElementById(elt).style.borderStyle = "solid";
	document.getElementById('auw').style.borderWidth = "2px";
	document.getElementById('auw').style.borderTopColor = "#888888";
	document.getElementById('auw').style.borderLeftColor = "#888888";
	document.getElementById('auw').style.borderBottomColor = "#eeeeee";
	document.getElementById('auw').style.borderRightColor = "#eeeeee";
	document.getElementById('auw').style.backgroundColor = "#ffffff"; /*restore background to white */
	document.getElementById('auw').style.color = "#000000";
	
	if(isNaN(auw)){
		/*alert("The weight you entered is not a number! \nPlease correct it."); */
/*		document.getElementById('auw').style.backgroundColor = "#ffdd99"; */
		
		document.getElementById('auw').style.borderStyle = "dotted";
		document.getElementById('auw').style.borderWidth = "2px";
		document.getElementById('auw').style.borderColor = "#ff0000";
		document.getElementById('auw').style.backgroundColor = "#ffff88";
		document.getElementById('auw').style.color = "#ff0000";  /*text color */
		document.getElementById('auw').value = "error!";
		document.getElementById('auw').focus();
	}
	return;
}
/*-------------------------------------------------*/
function show_tutorial(){
/*	window.open("tutorial.html","","top=150,left=150,width=700,height=590"); */
	window.open("tutorial.html","");

	return;
}
/*-------------------------------------------------*/
function show_info(myDoc){
//	window.open("info.html","","top=50,left=50,width=950");
//	return;

//Nov 2009 JC
//create results cell dynamically, then write to it.
	var newCell, newRow, html_string, n;
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..
	//remove all but the leftmost WebOCalc pane - delete other cells in outertable
	for(n=ncells-1; n > 0; n--){
		myDoc.getElementById('outertable').rows[0].deleteCell(n);
	}
	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row
	newCell.width = "350";
	var pagehtml;
	pagehtml = "<h3>About WebOCalc</h3>\n";
	pagehtml += '<fieldset class="myfieldset"> <legend>About WebOCalc</legend>\n';
	pagehtml += '<p class="helptext">Author: John Carri &copy; 2009</p>\n';
	pagehtml += '<p class="helptext">License: GNU <a href="https://web.archive.org/web/20160326131546/http://www.gnu.org/copyleft/gpl.html">GPL v. 2</a></p>\n';
	pagehtml += '<p class="helptext">WebOCalc is Free software, and you are welcome to redistribute it under the terms of the GPL version 2.</p>\n';
	pagehtml += '<p class="helptext">This Open Source program comes with ABSOLUTELY NO WARRANTY.</p>\n';
	pagehtml += '<p class="helptext">With special thanks to Glen Weber (GPW on RC Groups) for inspiring me to write this program.</p>\n';
	pagehtml += '</fieldset>';

	pagehtml += "<p> <input type='button' class='clickbtn' value='Close This Message' onclick='close_helpcell(document);'></p>";

	newCell.innerHTML = pagehtml;

	return
}
/*-------------------------------------------------*/
function show_help(){
//	window.open("../screenshots/howto.html","","top=50,left=50,width=950");
	window.location.href="../screenshots/howto.html"; /*load how-to */
	return;
}
/*-------------------------------------------------*/
function close_current_window_old(){
/* works, but leaves big empty panel behind ater close */
	window.close();
	return;
}
/*-------------------------------------------------*/
function show_metric_form(){
	window.location.href="html/webocalc_metric.html"; /*load the metric version of the form */
	return;
}
/*-------------------------------------------------*/
function show_imperial_form(){
	window.location.href="html/webocalc_imperial.html"; /*load the imperial version of the form */	
	return;
}
/*-------------------------------------------------*/
function close_midcell(i){
/*	alert("in close_midcell..."); */
	var x = parent.document.getElementById('outertable').rows;
	var y1 = x[1].cells; /*second row of table */
	y1[i].style.backgroundColor="#b6d0e2"; /*change background color of cell*/
	y1[i].innerHTML="";
	return;
}
/*-------------------------------------------------*/
function calculate_avg_chord(){
	var rootchord = parseFloat(document.getElementById('root_chord').value);
	var tipchord =  parseFloat(document.getElementById('tip_chord').value);
	var avgchord = (rootchord + tipchord)/2.0;
	parent.document.getElementById('wingchord').style.backgroundColor = "#b6d0e2"; /*change its background color to match form*/
 	parent.document.getElementById('wingchord').style.borderWidth = "1px";
 	parent.document.getElementById('wingchord').style.borderColor = "#b6d0e2";
 	parent.document.getElementById('wingchord').style.borderStyle = "solid";
	parent.document.getElementById('wingchord').value = avgchord.toFixed(2); /*update avg chord in main form */
}
/*-------------------------------*/
function find_max_thrust(nprops,prop_list){
	var i, best_i, thrust, max_thrust;
	if(nprops == 0){	//there were no suitable props found
		max_thrust = 0;
	}else{
		max_thrust = prop_list[0].thrust;
	}
	best_i = 0;
	for(i = 1; i < nprops; i++){
		thrust = prop_list[i].thrust;
		if(thrust > max_thrust){
			best_i = i;	//i-th propeller in the list has best thrust	
			max_thrust = thrust;
		}
	}
//	alert("best_i is " + best_i + ", max_thrust = " + (max_thrust*1000/28.35).toFixed(3) + "oz at line 248");
	return best_i;
}
/*-------------------------------*/
//March 22, 2009
//finds propeller with gear ratio closest to unity - i.e., best choice for direct-drive outrunner.
function find_direct_drive_prop(nprops,prop_list){
	var i, best_i, delta, delta_min;
	if(nprops == 0){	//there were no suitable props found
		delta_min = 0;
	}else{
		delta_min = Math.abs(1.0 - prop_list[0].gear_ratio);	//how far is the gear ratio from unity?
	}
	best_i = 0;
	for(i = 1; i < nprops; i++){
		delta = Math.abs(1.0 - prop_list[i].gear_ratio);
		if(delta < delta_min){
			best_i = i;	//i-th propeller in the list has best thrust	
			delta_min = delta;
		}
	}
	return best_i;
}
/*-------------------------------*/
//June 25 2008
function find_speed_and_thrust_factors(myplane){
//use the models wingspan, wing chord, weight, and flight mission to estimate pitch speed and thrust requirements.
	var mission = myplane.flight_mission;
	var speed_factor, thrust_factor;
//	alert("245: find_speed_thrust: flight mission is " + mission);
	if(mission == "novalue"){
		alert("You forgot to select a flight mission. Please go back and select one.");
	}else if(mission == "gentlescale"){
		speed_factor = 2.5;
		thrust_factor = 0.75;
	}else if(mission == "slowsportaero"){
		speed_factor = 2.75;
		thrust_factor = 1.0;
	}else if(mission == "fastsportaero"){
		speed_factor = 3.25;
		thrust_factor = 1.0;
	}else if(mission == "slowstrongaero"){
		speed_factor = 2.75;
		thrust_factor = 1.5;
	}else if(mission == "medstrongaero"){
		speed_factor = 3.0;
		thrust_factor = 1.5;
	}else if(mission == "faststrongaero"){
		speed_factor = 3.25;
		thrust_factor = 1.5;
	}else if(mission == "advpatt"){
		speed_factor = 3.25;
		thrust_factor = 1.7;
	}else if(mission == "slow3D"){
		speed_factor = 2.5;
		thrust_factor = 1.75;
	}else if(mission == "fast3D"){
		speed_factor = 3.0;
		thrust_factor = 1.75;
	}else if(mission == "mildrace"){
		speed_factor = 3.75;
		thrust_factor = 1.5;
	}else if(mission == "fastrace"){
		speed_factor = 4.5;
		thrust_factor = 1.6;
	}
//	alert("276: flight mission: " + mission + " speed_factor: " + speed_factor + " thrust_factor: " + thrust_factor);
	myplane.speed_factor = speed_factor;	//copy results into myplane object
	myplane.thrust_factor = thrust_factor;
	return 0;
}
/*-------------------------------*/
//function to suggest a suitable pitch speed and thrust for the model
function suggest_speed_and_thrust(myDoc,flag){
//	alert("329: in suggest_speed_and_thrust();  myDoc = " + myDoc + "flag = " + flag);
	var plane1 = new Object();
	plane1 = read_airframe_data(myDoc);	//read in wing span, chord, model weight, number of wings, scaling percentage
//	alert("332");
	if(plane1.errors == 1){
//		alert("334: errors!");
		return 1;
	}else{
//		alert("337");
		var Vstall = find_stall_speed(plane1.wing_loading);
		plane1.stall_speed = Vstall; /* stall speed in km/hr */
		var pitch_speed = (Vstall/3.6) * plane1.speed_factor;	/* pitch speed in metres/second */
		var thrust_at_pitch_speed = (plane1.auw/1000.0)* 9.81 * plane1.thrust_factor;//weight in Newtons * thrust_factor = thrust in Newtons
		var prop_power_out = pitch_speed * thrust_at_pitch_speed;  //power = force x velocity, watts, newtons and metres/sec
		var motor_eff = parseFloat(myDoc.getElementById('motor_eff').value);
		var prop_eff = 0.70;	/* blind guess as to prop efficiency - it's often worse than this */
		var motor_power_in = prop_power_out/(motor_eff * prop_eff);
		motor_power_in /= 2.25;	/*props don't make the full static thrust at pitch speed - actual thrust is lower,
					  therefore, power needed is correspondingly lower. This factor found empirically. */
		var target_pitch_speed;
		var target_thrust;
	
		if( plane1.units == "imperial"){
			target_pitch_speed = (plane1.speed_factor * Vstall/1.609344).toFixed(0); /*pitch speed, convert kmph to mph */
			target_thrust = ((plane1.auw/28.35) * plane1.thrust_factor).toFixed(1);	//thrust in oz, in steps of 0.1 oz (3 gm)
		}else{	//metric units
			target_pitch_speed = (plane1.speed_factor * Vstall).toFixed(0); /* pitch speed, kmph */
			target_thrust = (plane1.auw * plane1.thrust_factor).toFixed(0);	//thrust in grams
		}
		//write suggested pitch speed, suggested thrust/weight ratio, or nothing at all to the form, depending on the value of "flag":
		if(flag == "setPitch"){
			myDoc.getElementById('estimated_power').value = motor_power_in.toFixed(0);	//write power required to hidden field in form
			myDoc.getElementById('target_pitch_speed').value = target_pitch_speed;		//write the suggested value into the text box.
		}else if(flag == "setThrust"){
			myDoc.getElementById('estimated_power').value = motor_power_in.toFixed(0);	//write power needed to hidden field in form
			myDoc.getElementById('target_thrust').value = target_thrust;	//write the suggested value into the text box.
		}
	}
}
/*-------------------------------*/
//function to read pitch speed, thrust, and motor efficiency, and estimate power required (required input power to motor)
function suggest_power_needed(myDoc,flag){
	var returnval;
	returnval = check_if_number(myDoc,'target_pitch_speed','desired pitch speed');
	if(returnval){
		return 1;
	}
	var pitch_speed = parseFloat(myDoc.getElementById('target_pitch_speed').value);

	returnval = check_if_number(myDoc,'target_thrust','desired thrust');
	if(returnval){
		return 1;
	}
	var target_thrust = parseFloat(myDoc.getElementById('target_thrust').value);
	
	var motor_eff = parseFloat(myDoc.getElementById('motor_eff').value);
	var formunits = myDoc.getElementById('formunits').value;

	if(formunits == "imperial"){
		pitch_speed *= 1.609344/3.6;	//mph to kmph to m/s
		target_thrust *= 28.35/1000.0 * 9.81;		//oz to gm to kg to Newtons
	}else{
		pitch_speed /= 3.6;
		target_thrust *= 9.81/1000.0;	//gm to kg to Newtons
	}

	var prop_eff;
	if(flag == "low"){	//minimum estimated motor power, resulting from good propeller efficiency
		prop_eff = 0.65;	// 70%  prop efficiency - it's usually worse than this
	}else if (flag	== "high"){	//maximum estimated motor power, resulting from poor propeller efficiency
		prop_eff = 0.55;	// 50% prop efficiency
	}
	var prop_power_out = pitch_speed * target_thrust;  //power = force x velocity, watts, newtons and metres/sec
	var motor_power_in = prop_power_out/(motor_eff * prop_eff);  //calculate power input to motor necessary to generate prop_power_out at output shaft

	motor_power_in /= 2.25;	/*props don't make the full static thrust at pitch speed - actual thrust is lower,
					  therefore, power needed is correspondingly lower. This factor found empirically. */
	return(motor_power_in);
}
/*-------------------------------*/
function suggest_pitch_speed(myDoc,units){
	var plane1 = new Object();
	plane1 = read_airframe_data(myDoc);	//read in wing span, chord, model weight, number of wings, scaling percentage
	
	if(plane1.errors == 1){
		return 1;
	}else{
		var Vstall = find_stall_speed(plane1.wing_loading);
		plane1.stall_speed = Vstall; /* stall speed in km/hr */
	
		if( plane1.units == "imperial"){
			document.getElementById('target_pitch_speed').value = (plane1.speed_factor * Vstall/1.609344).toFixed(0); /* suggest 2.75 x stall speed, convert kmph to mph*/
		}else{
			document.getElementById('target_pitch_speed').value = (plane1.speed_factor * Vstall).toFixed(0); /* suggest 2.75 x stall speed, kmph */
		}
	}
}
/*-------------------------------*/
//function to estimate battery voltage, #cells, type, motor current
function power_wizard(myDoc){
	var docname = myDoc.URL;
//	alert("462: in Power Wizard, myDoc has URL: " + docname);

	var flag = "low";	//good prop efficiency, find motor power required in this case
	var estimated_power1 = suggest_power_needed(myDoc,flag);
	flag = "high";		//poor prop efficiency, find motor power required (will be higher, obviously)
	var estimated_power2 = suggest_power_needed(myDoc,flag);
//Nov 2009 JC
//create results cell dynamically, then write to it.
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	var newCell, newRow, html_string, n;
	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..
	var n;
	//remove all but the leftmost WebOCalc pane - delete other cells in outertable
	for(n=ncells-1; n > 0; n--){
		myDoc.getElementById('outertable').rows[0].deleteCell(n);
	}
	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row
	newCell.width = "350";
	newCell.style.backgroundColor = "#b6d0e2"; /*change background color of cell*/
	var pagehtml;
	pagehtml = "<form id='vform' name='vform'>\n";
	pagehtml = "<h3>Battery Voltage/Current Wizard</h3>\n";
	pagehtml += "<fieldset class='myfieldset'>\n<legend>The battery wizard says:</legend>\n";
	pagehtml += "<p class='wizardtext' id='powerinfo'>To fly as specified, approximately "+ estimated_power1.toFixed(0) + " - " + estimated_power2.toFixed(0) + " watts will be needed, depending on propeller size.</p>\n";

	var result_background = "#c4d6e3";	
	var estimated_power = (estimated_power1 + estimated_power2)/2.0;
//	alert("451: n_motors = " + myDoc.getElementById('n_motors').value);
	var n_motors = parseInt(myDoc.getElementById('n_motors').value);
	var motor_msg, fullmsg;
	if(n_motors == 2){
		motor_msg = "both";
	}else if(n_motors == 3){
		motor_msg = "all three";
	}else if(n_motors == 4){
		motor_msg = "all four";
	}
	var estimated_power_per_motor = estimated_power/n_motors;	/*power per motor for multi-motor models.*/

	if(n_motors > 1){
		fullmsg = "Note: Total current draw for <b>" + motor_msg + "</b> motors is shown.";
	}else{
		fullmsg = "";
	}

//	alert("508 - about to read battery C-rate in function power_wizard");
// 	var C_rate = parseInt(myDoc.getElementById('c_rate').value);	/*battery C rate*/

//	var flight_duration = parseFloat(myDoc.getElementById('target_flight_duration').value); //desired flight duration entered by user


	var html_string =  "<p class='wizardtext'>Below are some suggested battery, current, and voltage combinations that can supply " + estimated_power.toFixed(0) +  " watts (the average of the two power estimates).<br>" + fullmsg + "</p>";

	pagehtml += html_string;
	html_string = "<p class='wizardtext'>Select a row from the table to copy values to the left WebOCalc pane, then click to close this help pane.</p>";
	pagehtml += html_string;

	html_string = "<table border='0' id='voltagetable' class='showhelp_table'>\n<tr>";
	html_string += "<td align='center'>a</td>";
	html_string += "<td align='center'>b</td>";
	html_string += "<td align='center'>c</td>";
	html_string += "<td align='center'>d</td>";
	html_string += "<td align='center'>e</td>";
	html_string += "<td align='center'>f</td>";
	html_string += "</tr>	</table>";
	pagehtml += html_string;
	html_string = "<p> <input type='button' class='clickbtn' value='Close voltage / current help' onclick='close_helpcell(document);'></p>";
	pagehtml += html_string;
	pagehtml += "</fieldset>";
	pagehtml += "</form>";
	newCell.innerHTML= pagehtml; 

//	var discharge_rate = parseFloat(myDoc.getElementById('c_rate').value);	//get maximum discharge rate of battery
//	alert("532: read battery C rate again, equals " + discharge_rate);
//	var run_time_minutes = 60.0/discharge_rate;	//full throttle flight duration

//	JGC Jun 4 2012
	run_time_minutes = parseFloat(myDoc.getElementById('target_flight_duration').value); //desired flight duration entered by user
	run_time_minutes /= 2.0;  //typical flight lasts twice as long as full throttle duration?
//	alert("540: run time = " + run_time_minutes);
	var energy_needed;	//total joules needed for this power level and this run time.
	var nimh_cell_mah_needed;
	var A123_cell_mah_needed;

	energy_needed = run_time_minutes * 60 * estimated_power;	//stored battery joules needed to support this much power for this length of time
	nimh_cell_mah_needed = energy_needed/K_nimh;

	var motor_eff = parseFloat(myDoc.getElementById('motor_eff').value);
//	var motor_weight = (estimated_power/2.45) * (0.75/motor_eff);	//2.5 grams/watt for a typical 75% efficient motor, scale for other efficiencies
	//above estimate works pretty well, 130 gm for a 300 W 70% efficient motor...that's about right.
//	var guessed_kv = (Math.sqrt(130.0/motor_weight)) * 1100.0;	//You can get a 130 gm cheap outrunner with a Kv of 1000...scale by motor weight
//	alert("397: kV estimate not working for small motors. Plot some real data and curve-fit to it...");
//	alert("398: estimated motor weight: " + motor_weight.toFixed(0) + " grams; Estimated motor Kv: " + guessed_kv.toFixed(0) + " rpm/V.");

	var vbat_min = 0.56 * Math.sqrt(estimated_power);	//obtained empirically Aug 3 2008. Works surprisingly well! (Nov 2009: suggests 1S nimh/ 1S A123 for Slow Stick & similar. Must fix!
	var vbat_max = 0.85 * Math.sqrt(estimated_power);

//Nov 7 2009 - make sure cell counts are > 1S if the model weighs more than some minimum threshold.
	check_if_number(myDoc,'auw','all up weight');
	var auw = parseFloat(myDoc.getElementById('auw').value);  /*all up weight of plane */
	var formunits = myDoc.getElementById('formunits').value;  /* what units are used for the weight? */
	if(formunits == "imperial"){
		auw *= 28.35;	//convert oz to grams
	}	
	var nnimh_min = find_cell_count(vbat_min,V_nimh_cell);
	var nnimh_max = find_cell_count(vbat_max,V_nimh_cell);
	if((nnimh_min == 1) && (auw > 80.0 )){	//model weighs more than 80 gm, 1 S nimh not a good choice; bump up to 2S
		nnimh_min++;
	}
	while(nnimh_min >= nnimh_max){	//make sure nnimh_max is > nnimh_min after bumping up nnimh_min
		nnimh_max++;
	}
	var nA123_min, nA123_max;
//Apr 6, 2009: wrote new function find_A123_counts() to do a better job of determining suitable A123 cell counts.
//This function returns a two-valued array, the first element is the minimum A123 cell count, the second element is the max A123 cell count.
//"tmp" array is used to pick these apart and re-assign them to nA123_min and n_A123_max without making two calls to find_A123_counts();
	var tmp = new Array(2);
//	alert("523...")
	tmp = find_A123_counts(myDoc,estimated_power);	//assign one array to another
//	alert("525...");
	nA123_min = tmp[0];
	nA123_max = tmp[1];
//	alert("528: nA123_min = " + nA123_min + " nA123_max = " + nA123_max);
	var count;
	var nimh_pack_mAh;
	var pack_voltage;
	var pack_current;
	var j=0,ncells = 6;		//# of cells in each row		
	var x = document.getElementById('voltagetable').rows;
	var y=x[0].cells;	//x[0] is first row
	for(j = 0; j < ncells; j++){
	 	y[j].style.backgroundColor= result_background; //change background colour
		y[j].innerHTML="";	//delete any previous html
	}
	y[0].innerHTML="Type";
	y[1].innerHTML="Cells";
	y[2].innerHTML="Size";
	y[3].innerHTML="Volts";
	y[4].innerHTML="Amps";
	y[5].innerHTML="<i><font size=\"-1\">Pick One:</font></i>";
//check if the table is already longer than one row - if so, delete previous data.
	var nrows = document.getElementById('voltagetable').rows.length;
	if(nrows > 1){		//previous wizard suggestions already in table, delete all but first row
		for(j = nrows-1; j >= 1; j--){
			document.getElementById('voltagetable').deleteRow(j);
		}
	}
	var tblBody = document.getElementById('voltagetable').tBodies[0];	//get table body
	var newCell, newRow;
	var cell_mAh, pack_V, pack_A;
	var returnval,html_string;

	for(count = nnimh_min; count <= nnimh_max; count++){
		nimh_pack_mAh = nimh_cell_mah_needed/count;	//how many mAh should the pack have to supply this power for this many minutes?
		nimh_pack_mAh = refine_mAh(nimh_pack_mAh);
		pack_voltage = count * V_nimh_cell;		// What is the voltage of the pack?
		pack_current = estimated_power/pack_voltage;	// What is the current draw to provide this amount of power?

		newRow = tblBody.insertRow(-1);		//create a new table row
		newCell = newRow.insertCell(0);
		newCell.innerHTML = 'Lipo';

		newCell = newRow.insertCell(1);
		newCell.innerHTML = count + "S";

		newCell = newRow.insertCell(2);
		cell_mAh = nimh_pack_mAh.toFixed(0);
		newCell.innerHTML = cell_mAh + " mAh";

		newCell = newRow.insertCell(3);
		pack_V = pack_voltage.toFixed(1);
		newCell.innerHTML = pack_V + " V";

		newCell = newRow.insertCell(4);
		pack_A = pack_current.toFixed(1);
		newCell.innerHTML = pack_A + " A";

		newCell = newRow.insertCell(5);
		returnval = "Lipo," + count + "," + cell_mAh + "," + pack_V + "," + pack_A;
		html_string = "&nbsp; <input type=\"radio\" name=\"batpick\" id=\"batpick\" align=\"right\" onclick=\"update_batt('myDoc');\" value=\"" + returnval + "\">";
//		alert("484: html = " + html_string);
		newCell.innerHTML = html_string;
	}
	for(count = nA123_min; count <= nA123_max; count++){
		if(count > 0){
			pack_voltage = count * V_A123_cell;	// What is the voltage of the pack?
			pack_current = estimated_power/pack_voltage;	// What is the current draw to provide this amount of power?

			newRow = tblBody.insertRow(-1);		//create a new table row
			newCell = newRow.insertCell(0);
			newCell.innerHTML = 'A123';

			newCell = newRow.insertCell(1);
			newCell.innerHTML = count + "S";

			newCell = newRow.insertCell(2);
			cell_mAh = 2300;
			newCell.innerHTML = cell_mAh + " mAh";

			newCell = newRow.insertCell(3);
			pack_V = pack_voltage.toFixed(1);
			newCell.innerHTML = pack_V + " V";

			newCell = newRow.insertCell(4);
			pack_A = pack_current.toFixed(1);
			newCell.innerHTML = pack_A + " A";

			newCell = newRow.insertCell(5);
			returnval = "A123," + count + "," + cell_mAh + "," + pack_V + "," + pack_A;
			html_string = "&nbsp; <input type=\"radio\" name=\"batpick\" id=\"batpick\" align=\"right\" onclick=\"update_batt('myDoc');\" value=\"" + returnval + "\">";
			newCell.innerHTML = html_string;
		}
	}
 	return;
}
/*-------------------------------*/
//find number of series nimh cells that is nearest fit to "vbat" volts
//aug 05 2008 
function find_cell_count(vbat,vcell){
	if(vbat < vcell/2){
		return 1;
	}else if (vbat > 60.0){
		alert("676: Warning: battery voltage over 60 volts in find_cell_count(). Continuing..");
	}
	var i = 0;
	var vnom = 0.0;

	do{
		i++;
		vnom = i * vcell;	//nominal voltage from "i" cells at "vcell" volts each
	}while(vnom < vbat);
	// at this point, "i" cells generates a voltage greater than vbat. Obviously, "i-1" cells generates a voltage less than vbat.
	// Find out which of these two numbers (i, or i-1) is closer to the nominal voltage:

	var diff1 = Math.abs((i*vcell - vbat)/vbat);
	var diff2 = Math.abs(((i-1)*vcell - vbat)/vbat);
//	alert("432: diff1 = " + diff1 + " ; diff2 = " + diff2);

	var cellcount;
	if (diff1 < diff2){
		cellcount = i;
	}else{
		cellcount = i-1;
	}
	return cellcount;
}
/*-------------------------------*/
//find min and max number of series A123 2300 mAh cells that will work with this model
//Since A123 cells are only available in one or two capacities, this uses a different algorithm than the one used to find nimh cell count - The pack weight and maximum possible pack output power are used, rather than "C" rate and mAh.
//apr 06 2009 

function find_A123_counts(myDoc,power_needed){
	check_if_number(myDoc,'auw','all up weight');
	var auw = parseFloat(myDoc.getElementById('auw').value);  /*all up weight of plane */
	var formunits = myDoc.getElementById('formunits').value;  /* what units are used for the weight? */
	if(formunits == "imperial"){
		auw *= 28.35;	//convert oz to grams
	}	
// Global variables: w_A123 = weight of 1 2300 mAh A123 cell.
// and A123_pout_max =  maximum watts that can be supplied by a 2300 mAh A123 cell
	var w_bat;
	var tempcounts = new Array();
	var A123_counts = new Array();
	var ncells;
	var i=0;
	for(ncells = 2; ncells < 15; ncells++){		//try 1S - 15S packs
		w_bat = ncells * w_A123;		//pack weight
		pack_pout = ncells * A123_pout_max;	//pack max output power
		if((w_bat/auw <= 0.25) && (pack_pout >= power_needed)){		//pack is light enough and supplies enough power
			tempcounts[i] = ncells;
			i++
		}
	}
//tempcounts[] array now has a list of cell counts that are suitable - for instance, it might contain "4,5,6,7".
//pick off the lowest and highest usable cell counts, and return these as minimum and maximum suitable cell counts, respectively
	A123_counts[0] = tempcounts[0];		//minimum usable A123 cell count
	A123_counts[1] = tempcounts[i-1];	//maximum usable A123 cell count
	return A123_counts;
}
/*-------------------------------*/
function refine_mAh(nimh_pack_mAh){
	var nimh_size = [10,20,30,50,90,130,200,220,250,300,350,400,450,500,600,650,750,800,910,1000,1100,1200,1320,1500,1800,2100,2500,3000,3300,4000,4400,5000,6000,6600,7200,8000,9400,10000,15000,20000];
	var nimh_size_error = [];
	var i,j,imin,imax,jmin,jmax,diff;
	i = 0;
	//skip cell sizes that are obviously too small
	while(nimh_size[i] < nimh_pack_mAh){
		i++
	}
	imin = i;

	//look through remaining typical nimh cell capacities and find error from ideal capacity
	for (i=imin; i < nimh_size.length; i++){
		diff = Math.abs( (nimh_pack_mAh - nimh_size[i])/nimh_pack_mAh);
		nimh_size_error[i] = diff;
	}
	//find pack capacity closest to ideal mAh - look for lowest percentage error
	var min, oldmin, m;
	oldmin = nimh_size_error[imin];
	m = imin;
	for (j=imin; j <= nimh_size.length; j++){
		min = nimh_size_error[j];
		if(min < oldmin){
			oldmin = min;	//update oldmin every time a lower error is found
			m = j;		//save corresponding array index
		}
	}
	var recommended_nimh_size = nimh_size[m];
	return recommended_nimh_size;
}
/*-------------------------------*/
function propsize_wizard(myDoc){
//	alert("759: in propsize_wizard.");
	var result_background = "#c4d6e3";
	//check and fetch values of wing span, wing chord, formunits
//	alert("763");
	check_if_number(myDoc,'wingspan','Wing Span');
//	alert("765");
	var wing_span = parseFloat(myDoc.getElementById('wingspan').value);
	check_if_number(myDoc,'wingarea','Wing Area');
//	alert("768");
	var wing_area = parseFloat(myDoc.getElementById('wingarea').value);
//	alert("770");

//	alert("772a: myDoc.getElementById('n_wings').value = " + myDoc.getElementById('n_wings').value);

	var n_wings = myDoc.getElementById('n_wings').value;
//	alert("772b;  n_wings = " + n_wings);

//	var n_wings = parseInt(myDoc.getElementById('n_wings').value);

//	var n_wings = myDoc.getElementById('n_wings').value;

//	alert("775: n_wings = " + n_wings + " wing_span = " + wing_span + " Wing Area = " + wing_area);

	wing_area /= n_wings;	//find the area of one wing if it's a biplane or triplane, for aspect-ratio calculations.	

//	alert("773");

	var formunits = myDoc.getElementById('formunits').value;
	var wing_chord;

	if(formunits == "metric"){	//area in square decimetres, span in millimetres...convert
		wing_chord = wing_area * 10000.0/wing_span;	//sq dm to sq mm, divide by span in mm
	}else{
		wing_chord = wing_area/wing_span;	//sq inches divided by inches
	}

//	alert("784");

	//check and fetch number of motors; use this to help determine maximum size of propeller
	check_if_number(myDoc,'n_motors','Number of Propellers');
	var n_motors = parseFloat(myDoc.getElementById('n_motors').value);
	var aspect_ratio = wing_span/wing_chord;
//	alert("778: aspect ratio = " + aspect_ratio);
	var min_prop_d, max_prop_d, eff_wing_span;

	if (aspect_ratio > 8.0){	//glider or other model with long skinny wing; prop dia is small fraction of wingspan
		eff_wing_span = wing_span * 0.95 / Math.pow(n_motors,0.8);	//Lose 5% of wingspan for fuselage width, divide remainder by num props
		min_prop_d = 0.15 * eff_wing_span;
		max_prop_d = 0.25 * eff_wing_span;	
	}else if( (aspect_ratio > 7.0) &&(aspect_ratio <= 8.0) ){	//glider or other model with long skinny wing; prop dia is small fraction of wingspan
		eff_wing_span = wing_span * 0.95 / Math.pow(n_motors,0.8);	//Lose 5% of wingspan for fuselage width, divide remainder by num props
		min_prop_d = 0.2 * eff_wing_span;
		max_prop_d = 0.33 * eff_wing_span;	
	}else if( (aspect_ratio > 3.0) && (aspect_ratio <= 7.0)){	//typical aerobatic model with stubby wings; prop dia up to 30% of wingspan
		eff_wing_span = wing_span * 0.9 / Math.pow(n_motors,0.8);	//lose 10% of wingspan for fuselage width, divide rem by num props
		min_prop_d = 0.2 * eff_wing_span;
		max_prop_d = 0.33 * eff_wing_span;

	}else if( (aspect_ratio > 2.0) && (aspect_ratio <= 3.0)){	//stubby wings;
		eff_wing_span = wing_span * 0.85 / Math.pow(n_motors,0.8);	//lose 10% of wingspan for fuselage width, divide rem by num props
		min_prop_d = 0.2 * eff_wing_span;
		max_prop_d = 0.4 * eff_wing_span;

	}else{	//this is a low aspect ratio model - prop dia can go up to a rather large fraction of the wingspan
//		alert("818");
		eff_wing_span = wing_span * 0.8 / Math.pow(n_motors,0.8);	//lose 20% of wingspan for fuselage width, divide rem by num props
//		alert("820");
		min_prop_d = 0.2 * eff_wing_span;
		max_prop_d = 0.5 * eff_wing_span;

	}
//Nov 2009 JC
//create results cell dynamically, then write to it.
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	var newCell, newRow, html_string, n;
	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..
	var n;

	//remove all but the leftmost WebOCalc pane - delete other cells in outertable
	if(ncells > 1){		//there are at least two cells showing - either a wizard or WebOCalc results are displayed
		n = ncells - 1;
		while(n > 0){
//			alert("810: ncells = " + n + ", deleting cell # "+ n);
			myDoc.getElementById('outertable').rows[0].deleteCell(n);
			n--;
		}
	}
	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row

	var x = document.getElementById('outertable').rows;
	var y1=x[0].cells;
	y1[1].width = "300";
	var pagehtml;
	pagehtml = "<h3>Propeller Sizing Wizard</h3>\n";
	pagehtml += "<fieldset class='myfieldset'>\n<legend>The propeller wizard says:</legend>\n";
	if(formunits == "metric"){
		min_prop_d /= 25.4;	//convert from mm to inches
		max_prop_d /= 25.4;	//convert from mm to inches
	}
//	var proplabel1, proplabel2;
// 	proplabel1 = '<this.style="background-color:white; width:100px">' + min_prop_d.toPrecision(2) + '</style>';

	pagehtml += "<p class='wizardtext' id='propinfo0'>Prop sizes<font size='+1'> from " + min_prop_d.toPrecision(2) + " to " + max_prop_d.toPrecision(2) + " inches</font> should be suitable for this model.</p>\n";
	pagehtml += "<p class='wizardtext' id='propinfo1'>Note that the " + min_prop_d.toPrecision(2) + " inch propeller will be least efficient. The " + max_prop_d.toPrecision(2)+ " inch propeller will be most efficient.</p>\n";
	pagehtml += "<p class='wizardtext' id='propinfo2'>However the " + max_prop_d.toPrecision(2) + " inch propeller will have stronger torque, P-factor, and gyroscopic effects. </p>\n";

	if(aspect_ratio <= 3.0){	//low aspect ratio wing
		pagehtml += "<p class='wizardtext' id='propinfo3'>Note: this model has a low aspect ratio wing. Because of this, there may be unavoidable strong prop torque reaction with many of the prop sizes suggested here. Choose smaller sizes to reduce this effect.</p>\n";
	}

	pagehtml += "<p class='wizardtext'>Select the maximum propeller size you will accept. WebOCalc will find propellers up to this maximum size.</p>\n";
//	pagehtml += "<p class='wizardtext'>Then click to close this help page.</p>\n"; 
	pagehtml += "<p> <input type='button' class='clickbtn' value='Close Prop Size Help' onclick='close_helpcell(document);'></p>";
	pagehtml += "</fieldset>\n";
	y1[1].innerHTML= pagehtml; 
	return;
}
/*-------------------------------*/
//function to estimate motor Kv
function kv_wizard(myDoc){
	var result_background = "#c4d6e3";
	var motor_kv,inrunner_kv1,inrunner_kv2,outrunner_kv1,outrunner_kv2;
	//retrieve pitch speed, prop diameter, battery voltage, motor efficiency from main form...
	check_if_number(myDoc,'target_pitch_speed','Desired pitch speed');	//make sure this field was filled in
	var pitch_speed = parseFloat(myDoc.getElementById('target_pitch_speed').value);  /*target pitch speed*/	
	check_if_number(myDoc,'max_prop_dia','maximum prop size');
//	var prop_dia = 	parseInt(myDoc.getElementById('max_prop_dia').value);	//max prop dia in INCHES
	var prop_dia = 	parseFloat(myDoc.getElementById('max_prop_dia').value);	//max prop dia in INCHES
	check_if_number(myDoc,'vbat','battery voltage');
	var vbat = parseFloat(myDoc.getElementById('vbat').value);	//battery voltage
	check_if_number(myDoc,'motor_eff','motor efficiency');
	var motor_eff = parseFloat(myDoc.getElementById('motor_eff').value);	//motor eff		
	var formunits = myDoc.getElementById('formunits').value;
	if(formunits == "metric"){
		pitch_speed /= 1.609344;	//convert kmph to mph
	}
	//estimate highest suitable outrunner Kv; do this by reducing prop diameter to 80% of maximum prop size selected by user.	
	motor_kv = suggest_kv(myDoc,pitch_speed,(prop_dia * 0.8),vbat,motor_eff);
	//round Kv to 2 significant digits
	outrunner_kv2 = round_2sigdig(motor_kv);
	//estimate lowest suitable outrunner Kv
	motor_kv = suggest_kv(myDoc,pitch_speed,prop_dia,vbat,motor_eff);
	//round Kv to 2 significant digits
	outrunner_kv1 = round_2sigdig(motor_kv);
	inrunner_kv1 = 2.5 * motor_kv;	//gearbox ratio of 2.5, low end of typically available ratios
	inrunner_kv1 = round_2sigdig(inrunner_kv1);
	inrunner_kv2 = 4.5 * motor_kv;	//gearbox ratio of 4.5, high end of typically available ratios
	inrunner_kv2 = round_2sigdig(inrunner_kv2);

//Nov 2009 JC
//create results cell dynamically, then write to it.
	var newCell, newRow, html_string, n;
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..
	//remove all but the leftmost WebOCalc pane - delete other cells in outertable
	for(n=ncells-1; n > 0; n--){
		myDoc.getElementById('outertable').rows[0].deleteCell(n);
	}
	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row
	newCell.width = "350";


	var pagehtml;
	pagehtml = "<h3>Motor Kv Selection Wizard</h3>\n";
	pagehtml += "<fieldset class='myfieldset'>\n<legend>The motor Kv wizard says:</legend>\n";
	pagehtml += "<p class='wizardtext' id='kvinfo'>If you plan to use a gearbox, motors with Kv between " + inrunner_kv1 + " rpm/V and " + inrunner_kv2  + " rpm/V are suitable.</p>\n";
	pagehtml += "<p class='wizardtext' id='kvinfo2'>If you plan to use a direct-drive motor, motors with Kv between " + outrunner_kv1 + " and " + outrunner_kv2 + " rpm/V should be suitable.</p>\n";
	pagehtml += "<p class='wizardtext' id='kvinfo3'>If WebOCalc finds no suitable propellers using the suggested direct-drive Kv, try raising the Kv till propellers are found. Then lower the Kv in steps while WebOCalc continues to find suitable propellers.</p>\n";
	pagehtml += "<p class='helptext'>Decide on a Kv, then click the 'Close' button.</p>";
	pagehtml += "<p> <input type='button' class='clickbtn' value='Close Kv Wizard' onclick='close_helpcell(document);'></p>";
	pagehtml += "</fieldset>\n";
	newCell.innerHTML= pagehtml; 
	return;
}
/*-------------------------------*/
function suggest_flight_duration(myDoc){
//	alert("Line 941, in function suggest_flight_duration");
//create results cell dynamically, then write to it.
	var newCell, newRow, html_string, n;
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..
	//remove all but the leftmost WebOCalc pane - delete other cells in outertable
	for(n=ncells-1; n > 0; n--){
		myDoc.getElementById('outertable').rows[0].deleteCell(n);
	}
	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row
	newCell.width = "350";
//	alert("Line 953");
	var pagehtml;
	pagehtml = "<h3>Flight Duration</h3>\n";
	pagehtml += "<fieldset class='myfieldset'>\n<legend>Choosing a desired flight duration:</legend>\n";
	pagehtml += "<p class='helptext'>With todays battery and motor technology, flight times ranging from a few minutes to an hour are possible.</p>";
	pagehtml += "<p class='helptext'><span class='legendtext'>Large models / glow conversions:</span> Flight durations of 5 to 7 minutes are typical for larger models weighing over 5 lbs or 2.5 kilograms.</p>";
	pagehtml += "<p class='helptext'><span class='legendtext'>Large park-size models:</span> Flight durations of 7 to 12 minutes are typical for larger acrobatic park-sized models weighing  1 - 3 lbs (450 gm - 1.5 kilograms).</p>";
	pagehtml += "<p class='helptext'><span class='legendtext'>Small or slow park-size models:</span> Flight durations of 15 to 30 minutes are typical for small or slow park-sized models, typically weighing less than 1 lb (450 grams).</p>";
	pagehtml += "<p class='helptext'><span class='legendtext'>Very light / very slow models:</span> Flight durations of 30 to 60 minutes are possible for very light, very slow park-sized models.</p>";
	pagehtml += "<p class='helptext'>Enter a flight duration that is reasonable for the model you are considering, then click the button to close this help page.</p>";
	pagehtml += "<p> <input type='button' class='clickbtn' value='Close' onclick='close_helpcell(document);'></p>";
	pagehtml += "</fieldset>\n";
	newCell.innerHTML= pagehtml; 
	return;
}
/*-------------------------------*/
function round_2sigdig(motor_kv){
	var scaled_kv,rounded_kv,j;
	j = 1;
	scaled_kv = motor_kv;
	while(scaled_kv > 100.0){
		scaled_kv /= 10;
		j *= 10;	
	}
	rounded_kv = Math.round(scaled_kv) * j;
	return rounded_kv;
}
/*-------------------------------*/
function round_off_one_digit(mynumber){
	var scaled_num, rounded_num;
	scaled_num = mynumber/10;
	rounded_num = Math.round(scaled_num)*10;
	return rounded_num;
}
function toSigDig(num,places){
	var scaled_num, rounded_num, ulimit,j;
	scaled_num = num;
	ulimit = Math.pow(10,places);
	j=1;
	while(scaled_num > ulimit){
		scaled_num /= 10;
		j *= 10;	
	}
	rounded_num = Math.round(scaled_num) * j;
	return rounded_num;
}
/*-------------------------------*/
function suggest_kv(myDoc,pitch_speed,prop_dia,vbat,motor_eff){
	//pitch speed = prop rpm in thousands x prop pitch in inches x 0.95
	var prop_pitch = prop_dia * 0.7;	//set pitch to 70% of prop dia.
	var prop_rpm = pitch_speed * 1000.0/(prop_pitch * 0.95);	//estimate prop rpm needed to achieve this pitch speed.
	var motor_kv;
	//prop rpm = motor Kv x vbat x motor_efficiency; so kv = prop rpm/(vbat x motor eff);	
	//var motor_kv = prop_rpm/(vbat * motor_eff);
//previous motor_kv calc turned out to be excessively sensitive to motor efficiency; not sure why.
//	motor_kv = prop_rpm/(vbat * Math.pow(motor_eff,0.75));	//worked better; sqrt too insensitive, power 1 too sensitive 
	motor_kv = prop_rpm/(vbat * Math.pow(motor_eff,0.9));	//worked better; sqrt too insensitive, power 1 too sensitive 
	return motor_kv;
}	
/*-------------------------------*/
//This function, find_stall_speed, returns the stall speed in kmph, given the wing loading in grams per square decimetre.
function find_stall_speed(wing_loading){
//	alert("260: wing loading = " + wing_loading + "gm/dm²");
	var stall_speed;
	var Wldg;
	var rho_air = 1.25; //kg/m³, density of air at sea level
	var Cl_max = 1.0;	//max lift coefficient of wing. Can vary with aerofoil, but 1.0 is usable approx
	Wldg = wing_loading / 100.0;  /* convert gm/dm^2 to gm/cm^2 */
	Wldg *= 10000.0;	//grams per square metre
	Wldg /= 1000.0;		//kg per square metre
	Wldg *= 9.81;		//Newtons per square metre
	stall_speed = Math.sqrt(2*Wldg/rho_air);  //metres/sec, calculated from mg = 1/2 Cl rho_air V² S
	stall_speed *= 3.6;	//convert m/s to km/hr
	return stall_speed;
}
/*-------------------------------*/
function read_airframe_data(myDoc){
	var plane = new Object();
	var error1,error2,error3;
	error1 = check_if_number(myDoc,'auw','all up weight');
	error2 = check_if_number(myDoc,'wingspan','wingspan');
	error3 = check_if_number(myDoc,'wingarea','wing area');
	if(error1 || error2 || error3){
		plane.errors = 1;
	}else{
		plane.errors = 0;
	}
	plane.units = myDoc.getElementById('formunits').value;
//	alert("394: in read_airframe_data, plane.units = " + plane.units);
	plane.auw = parseFloat(myDoc.getElementById('auw').value);  /*all up weight of plane */
	plane.nwings = parseInt(myDoc.getElementById('nwings').value);   /*number of wings - 2 = biplane, 3 = triplane */ 
	plane.wing_span = parseFloat(myDoc.getElementById('wingspan').value); /* wing span */
	plane.wing_area = parseFloat(myDoc.getElementById('wingarea').value); /* wing area */

	if(plane.units == "metric"){
		plane.wing_chord = plane.wing_area*10000.0/plane.wing_span;	//sq dm to sq mm, then divide by span in mm
	}else{
		plane.wing_chord = plane.wing_area/plane.wing_span;
	}
//	alert("820: span = " + plane.wing_span + ", wing area = " + plane.wing_area + " ,wing chord = " + plane.wing_chord);
	plane.flight_mission = (myDoc.getElementById('flight_mission').value);   //flight mission - helps choose power, pitch speed
	find_speed_and_thrust_factors(plane);	/*reads weight, span, chord, flight mission, updates plane.speed_factor and plane.thrust_factor to
//						reflect airframe and user requirements */
	plane.scalesize_percent = 100; 
	var scalefactor = plane.scalesize_percent/100.0;  /*find variables that are independent of units */

 	if( plane.units == "imperial"){ /*all the properties of the plane object are in imperial units, so convert them to metric*/
		plane.auw *= 28.35;  /*convert ounces to grams */
		plane.wing_span *= 25.4; /* convert inches to mm */
		plane.wing_chord *= 25.4;  /* convert inches to mm */
	}
	/* at this point all variables should be in metric units; if entered in Imperial units, they have been converted to metric */
	// so from now on, treat all quantities as metric until computed results need to be written back to the form in appropriate units.
	plane.wing_span *= scalefactor;  /*scale wing span according to scalefactor */
	plane.wing_chord *= scalefactor;  /*scale wing span according to scalefactor */
	plane.wing_area = plane.nwings * plane.wing_span * plane.wing_chord; /*scaled wing area in mm^2 */

	plane.wing_area /= 10000; /*convert scaled wing area from mm^2 to dm^2 */
	plane.wing_loading = plane.auw/plane.wing_area;  /* grams per square decimetre */
//	alert("852: wing chord = " + plane.wing_chord);
	plane.cubic_wing_loading = 2.05*plane.auw*1e6/(plane.nwings * Math.sqrt(plane.nwings) * plane.wing_span * plane.wing_span * plane.wing_chord);  /* grams per dm^3 */

/*	plane.cubic_wing_loading = 2.05*plane.auw*1e6/(plane.wing_span * plane.wing_span * plane.wing_chord); */
	/* grams per dm^3 */
	//this formula taken from a Model Airplane News article by Larry Reneger titled "3D Wing Loading". It is a form of
	//cubic wing loading, but includes the effect of aspect ratio when comparing one model to another of different shape. 
	//The fudge-factor of 2.05 makes this new formula match the results of my old formula, so I don't have to change all the
	//numbers in the function flying_style (while getting the same predictions for the same model as before).
//	alert("439: end of read_airframe_data.");
	return plane;
}
/*-------------------------------*/
function show_results(myDoc,units,resulttype){
//	clear_extended_results();
	var plane = new Object();
	var error8;
	plane = read_airframe_data(myDoc);	//read in wing span, chord, model weight, number of wings, scaling percentage
	if(plane.errors == 1){
		return;
	}
	var Vstall = find_stall_speed(plane.wing_loading);
	plane.stall_speed = Vstall; /* stall speed in km/hr */

	error8 = check_if_number(myDoc,'target_pitch_speed','Desired pitch speed');	//make sure this field was filled in
	plane.target_pitch_speed = parseFloat(myDoc.getElementById('target_pitch_speed').value);  /*target pitch speed*/

	if(plane.errors || error8){
		return 1;
	}
	
 	if( plane.units == "imperial"){ /*all the properties of the plane object are in imperial units, so convert them to metric*/
		plane.target_pitch_speed *= 1.6; /* convert mph to kmph */
	}

	if(plane.target_pitch_speed < 1.3 * Vstall){
		alert("You specified a pitch speed too low to fly this plane safely. \n Please increase target pitch speed and try again.");
		return 1;
	}else if((plane.target_pitch_speed >= 1.3 * Vstall) && (plane.target_pitch_speed < 1.5 * Vstall)){
		alert("You specified a pitch speed that is dangerously low. The model will barely fly at full throttle.\n");
	}else if((plane.target_pitch_speed >= 1.5 * Vstall) && (plane.target_pitch_speed < 1.7 * Vstall)){
		alert("You specified a pitch speed that is lower than optimal. The model will fly, but more pitch speed would be better.\n");
	}else if((plane.target_pitch_speed >= 1.7 * Vstall) && (plane.target_pitch_speed < 1.9 * Vstall)){
		alert("You specified a pitch speed that is a little lower than optimal. The model will fly, but more pitch speed would be better.\n");
	}else if((plane.target_pitch_speed >= 1.9 * Vstall) && (plane.target_pitch_speed < 2.2 * Vstall)){
		alert("You specified a pitch speed that is slightly lower than optimal. Consider a higher pitch speed for better performance.\n");
	}
	plane.battery_voltage = parseFloat(myDoc.getElementById('vbat').value);
	plane.motor_current = parseFloat(myDoc.getElementById('motor_current').value);
	plane.motor_input_power = plane.battery_voltage * plane.motor_current;	//input watts per motor
	
	var n_motors = parseInt(myDoc.getElementById('n_motors').value); /* number of motor/prop combos on plane - single, twin, trimotor, etc */
	plane.n_motors = n_motors;
	plane.max_prop_dia = parseInt(myDoc.getElementById('max_prop_dia').value);	//max prop dia in INCHES.
	var motor_eff = parseFloat(myDoc.getElementById('motor_eff').value); /*motor eff, ex 0.65 for ferrite can motors */

//	motor_eff = motor_eff + 0.02; //Aug 2008
//	motor_eff = motor_eff - 0.02;   //Mar 2009 - small tweak (2% reduction) makes results more accurate.
//	motor_eff = motor_eff - 0.01;   //Mar 2009 - small -1% tweak makes results more accurate.

	var motor_kv =  parseFloat(myDoc.getElementById('motor_kv').value);	/*motor rpm/volt*/
	plane.motor_rpm = motor_kv * plane.battery_voltage * motor_eff;
	plane.motor_output_power = plane.motor_input_power * motor_eff;
	plane.power_loading = plane.motor_input_power/plane.auw;  /*Watts per gram */

	var Re;
	var L;
	L = plane.wing_chord/1000.0;       /* chord in metres */
	Re = 68459.0 * plane.stall_speed * L/ 3.6;
	plane.Re = Re;
	plane.min_pitch_speed = (2.5 * plane.stall_speed).toFixed(0);
	plane.max_pitch_speed = (3.0 * plane.stall_speed).toFixed(0);

	var prop_list = new Array(new prop_object_v2(-1,-1,-1,-1,-1,-1,-1));
	var nprops,t1,t2,best_thrust, best_thrust_index, best_prop_dia, best_prop_pitch, best_prop_rpm, best_prop_pitch_speed, best_prop_type;
	nprops = find_prop_size_v2(prop_list,plane); /*nprops is the number of suitable props, may be zero*/
	best_thrust_index = find_max_thrust(nprops,prop_list);	//function to pick out the prop that has max thrust.
	best_thrust = prop_list[best_thrust_index].thrust;	//returns max thrust available from any prop, in kg.
	best_prop_type = prop_list[best_thrust_index].proptype;
	best_prop_dia = prop_list[best_thrust_index].dia;
	best_prop_pitch = prop_list[best_thrust_index].pitch;
	best_prop_pitch_speed = prop_list[best_thrust_index].pitch_speed;
	best_prop_rpm = prop_list[best_thrust_index].rpm;
//Mar 22, 2009
//find propeller size closest to direct-drive ratio, for outrunners
	var best_outrunner_index=find_direct_drive_prop(nprops,prop_list);

//-----prop_object has these properties--------
//	this.type = proptype;
//	this.dia = D;
//	this.pitch = P;
//	this.rpm = N;
//	this.pitch_speed = Vp;
//	this.thrust = T;
//	this.gear_ratio
//--------------------
	var f_style = flying_style2(plane);
	var pwr_levl = power_level(plane,best_thrust);
	var result_background = "#ffca64";	//a cheery orange
	result_background = "#ffebaa";	//Less orange, more biscuit
	var blue_background = "#b6d0e2";	//background colour, pale blue
//	var darkerblue_background = "#a5c8e0";	//darker blue, used alternating with blue_background for better readability. NOT ENOUGH CONTRAST
//	var darkerblue_background = "#8bbcde";	//darker blue, used alternating with blue_background for better readability. GOOD
	var darkerblue_background = "#99c3e0";	//darker blue, used alternating with blue_background for better readability
	var warning_background = "#ff9385";	//change background colour when displaying a warning message
	var yellow_background = "#ffffaa";	//yellow  background for left hand column of data table

 var msg,msg2,msg3,wl_msg;
 if(plane.units == "imperial"){
  t1 = (plane.min_pitch_speed/1.609344).toFixed(0); /*Convert km/hr to miles/hr */
  t2 = (plane.max_pitch_speed/1.609344).toFixed(0);
  msg = t1 + " - " + t2 + " mph.";
  msg2 = (Vstall/1.609344).toFixed(1) + " mph.";
  msg3 = (plane.wing_span/25.4).toFixed(2) + " in.";
 }else if( plane.units == "metric"){
  msg = plane.min_pitch_speed + " - " + plane.max_pitch_speed + " km/hr.";
  msg2 = Vstall.toFixed(1) + " km/hr.";
  msg3 = plane.wing_span.toFixed(1) + " mm.";
 }else{
  alert("unknown units: " + plane.units + "at line 1019 in file webocalc.js"); 
 }
 
var t_min = 10.0;	//minimum flight time before running into field boundary - say 10 seconds.
var field_width = (plane.target_pitch_speed/3.6) * t_min;	//dist covered in T seconds at pitch speed - approx full throttle speed.
var field_length = 1.4 * field_width;
var raw_length, raw_width;
//confirm("1020: Verify rounding of metric flying field length!");
  if(plane.units == "imperial"){
	wl_msg = (plane.wing_loading * 0.3277).toFixed(2) + " oz/square foot.";	//0.3277 converts gm/dm² into oz/sq ft
	raw_length = field_length * 39.37/12.0;
	field_length = round_2sigdig(raw_length);
	raw_width = field_width * 39.37/12.0;	
	field_width = round_2sigdig(raw_width);
	msg3 = field_length + " x " + field_width + " feet.";
 }else if( plane.units == "metric"){
	wl_msg = plane.wing_loading.toFixed(1) + " gm/dm<sup><font size =\"-1\">2</font></sup>.";
	field_length = round_off_one_digit(field_length);
	field_width = round_off_one_digit(field_width);
	msg3 = field_length + " x " + field_width + " metres.";
 }
//Nov 2009 JC
//create results cell dynamically, then write to it.
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	var newCell, newRow, html_string, n;
//	var outercell_background = "#ffdddd";

	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..
//	alert("1071: ncells = " + ncells);
	var n;
//	for(n=ncells-1; n > 0; n--){
	for(n=ncells-1; n > 0; n--){
//		alert("1074, looping, n = " + n);
		myDoc.getElementById('outertable').rows[0].deleteCell(n);
	}
	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row
//	newCell.style.backgroundColor = outercell_background;	//set bgcolour

	html_string = '<h4>Estimated Model Performance</h4>\n';

	html_string += '<fieldset class="myfieldset">\n<legend>WebOCalc Results:</legend>';

	html_string += "<table class='resultsgrouptable' id='resultstable' border='0'>";
	html_string += "<tbody><tr><td class='yellowtextcell'>Results unknown. Fill out form, press Calculate.</td>\n</tr>\n</tbody>\n</table>\n";
//	html_string += "<table class='resultsgrouptable' id='more_results_table' border='1'><tbody>";
	html_string += '<table class="resultsgrouptable" id="Xmore_results_table" border="0"><tbody>';
	html_string += "<tr>\n<td colspan='8' class='bgtextcell'>sdasda - Xmore_results_table</td>\n</tr>";


	html_string += "<tr>\n";
	for(n=1; n <= 8; n++){
		html_string += "<td class='bgtextcell'>A</td>\n";
	}
	html_string += "</tr>\n";

	html_string += "<tr>\n";
	for(n=1; n <= 8; n++){
		html_string += "<td class='bgtextcell'>A</td>\n";
	}
	html_string += "</tr>\n";

	html_string += "</tbody>\n </table>\n </fieldset>";

	newCell.innerHTML = html_string;	//write out message

//Mar 21 2009 JC
//check if the results table is already longer than one row - if so, delete previous data and 2nd cell from 1st row.
 var nrows = myDoc.getElementById('resultstable').rows.length;
	if(nrows > 1){		//previous entries already in table, delete all but first row
		for(j = nrows-1; j >= 1; j--){
			myDoc.getElementById('resultstable').deleteRow(j);
		}
		//now delete 2nd cell in first row
			myDoc.getElementById('resultstable').rows[0].deleteCell(1);
	}
// Dynamically add rows/cells to the table and write into them
 var tblBody = myDoc.getElementById('resultstable').tBodies[0];	//get table body

 var newCell, newRow;
 var html_string;

//write out "Flies like" characteristic
 newRow = tblBody.rows[0];		//access first row...
 newCell = newRow.cells[0];
 newCell.style.backgroundColor = yellow_background;
 newCell.innerHTML = 'Flies Like:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = yellow_background;
 newCell.innerHTML = f_style;

//Write out "Power Level" message
 newRow = tblBody.insertRow(-1);		//create a new table row
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = result_background;
 newCell.innerHTML = 'Power Level:<br><i><font size="-1">(with white highlighted prop)</font></i>';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = result_background;
 newCell.innerHTML = pwr_levl;

//Add required pilot skill level
 newRow = tblBody.insertRow(-1);		//create a new table row
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = yellow_background;
 newCell.innerHTML = 'Minimum Pilot Skill Needed:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = yellow_background;
 newCell.innerHTML = plane.skill_level;

//Add flying field size recommendation
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = result_background;
 newCell.innerHTML = 'Minimum Flying Field Size:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = result_background;
 newCell.innerHTML = msg3;

//Add battery size recommendation
 var desired_duration,cellcount,celltype,C_rate,I_bat, approx_pack_mAh, recommended_pack_mAh, bat_cap_msg, cell_count_msg;
 
 check_if_number(myDoc,'target_flight_duration','Desired Flight Duration');

 desired_duration = parseFloat(myDoc.getElementById('target_flight_duration').value); //desired flight duration
// alert("1324: flight duration = " + desired_duration);
 cellcount = parseInt(myDoc.getElementById('cellcount').value); /* # of series cells */
 cell_count_msg = cellcount + "S";

 I_bat =  parseFloat(myDoc.getElementById('motor_current').value);	/*motor current*/
 celltype = myDoc.getElementById('celltype').value;	/*nimh or a123?*/

 var wot_duration,low_dur,high_dur, duration_msg;

 if(celltype == "nimh"){
//	alert("Line 1333: Calculate flight duration with Lipo batteries here!");
// 	C_rate = parseInt(myDoc.getElementById('c_rate').value);	/*battery C rate*/
	C_rate = 60.00/desired_duration;	//battery discharge rate matching user-specified duration
	C_rate *= 2.0;	//duration based on flight average power being half of full power; double C_rate to allow for actual peak current
//	alert("1331: C_rate = " + C_rate);
	approx_pack_mAh = I_bat/C_rate * 1000.0;	/*theoretical pack capacity */
	recommended_pack_mAh = refine_mAh(approx_pack_mAh);	/* pick nearest commercially available size */
 	bat_cap_msg = cellcount + "S, " + recommended_pack_mAh.toFixed(0) + " mAh, " + C_rate.toFixed(0) + " C, lithium polymer.";
 }else if(celltype == "a123"){
//	alert("Line 1341: Calculate flight duration with A123 batteries here!");
 	recommended_pack_mAh = 2300;	/*WebOCalc only deals with 2300 mAh A123's */
 	bat_cap_msg = cellcount + "S, " + 2300 + " mAh, A123 lithium ion.";
 }else{
	alert("1117: Unknown battery type!");
 }
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = blue_background;
 newCell.innerHTML = 'Minimum Battery Size:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = blue_background;
newCell.innerHTML = bat_cap_msg;

//Estimated flight duration---------------
 
 wot_duration = 60.0 * recommended_pack_mAh/(I_bat*1000.0);	//full throttle duration
 low_dur = (wot_duration * 1.5).toFixed(0);	//estimate duration if flown very hard
 high_dur = (wot_duration * 2.5).toFixed(0);	//estimate duration if flown gently with good throttle management
 duration_msg = low_dur + " to " + high_dur + " minutes depending on pilot.<br> Will vary with throttle usage.";
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = darkerblue_background;
// alert("1359: Fix estimated flight duration calculation below:");
 newCell.innerHTML = 'Estimated Flight Duration:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = darkerblue_background;
 newCell.innerHTML = duration_msg;
//----------------------------------------



// add ESC suggested capacity
 var ESC_size_msg, temp1,temp2;
 temp1 = I_bat * 1.3;	/*minimum ESC current rating is at least 10% bigger than actual WOT motor current */
 temp2 = I_bat * 1.5;
// alert("1180: before SigDig: temp1 = " + temp1 + " temp2 = " + temp2);
 temp1 = toSigDig(temp1,2);
 temp2 = toSigDig(temp2,2);
// alert("1183: after SigDig: temp1 = " + temp1 + " temp2 = " + temp2);

 if(temp2 > temp1){
	 ESC_size_msg = temp1.toFixed(0) + " A to " + temp2.toFixed(0) + " A.";
 }else{
	 ESC_size_msg = temp1.toFixed(0) + " A.";
}

 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = darkerblue_background;
 newCell.innerHTML = 'Suggested ESC Rating:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = darkerblue_background;
 newCell.innerHTML = ESC_size_msg;

//Add watts in / watts out
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = blue_background;
 newCell.innerHTML = 'Power Into / Out of Motor:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = blue_background;

 var power_to_prop = plane.motor_output_power;
 var power_to_motor = plane.motor_input_power;
 var pwr_msg = power_to_motor.toFixed(1) + " watts in / " + power_to_prop.toFixed(1) + " watts out.";
 newCell.innerHTML = pwr_msg;

//Add power loading watts/lb or watts/kg
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = darkerblue_background;
 newCell.innerHTML = 'Power To Weight Ratio:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = darkerblue_background;
// alert("1058: myplane.auw = " + plane.auw );
 var weight, auw_msg, power_to_weight;
 if(plane.units == "imperial"){
	weight = plane.auw/(28.35*16.0);	//convert grams to lbs
	power_to_weight = plane.motor_input_power/weight;
	auw_msg = power_to_weight.toFixed(2) + " watts/pound.";
 }else if( plane.units == "metric"){
	weight = plane.auw/1000.0;	//convert grams to kg
	power_to_weight = plane.motor_input_power/weight;
	auw_msg = power_to_weight.toFixed(2) + " watts/kg.";
 }
 newCell.innerHTML = auw_msg;

//Add stall speed 06/14/2009
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = blue_background;
 newCell.innerHTML = 'Estimated Stall Speed:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = blue_background;
 newCell.innerHTML = msg2;

//add wing loading
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = darkerblue_background;
 newCell.innerHTML = 'Wing Loading:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = darkerblue_background;
 newCell.innerHTML = wl_msg;

//add cubic wing loading
 if(plane.units == "imperial"){
  msg = (plane.cubic_wing_loading).toFixed(2) + " oz/cubic foot.";
 }else if( plane.units == "metric"){
  msg = (plane.cubic_wing_loading).toFixed(1) + " gm/dm<sup><font size =\"-1\">3</font></sup>.";
 }else{
  alert("unknown units: " + plane.units + "at line 1006 in file webocalc.js"); 
 }
 newRow = tblBody.insertRow(-1);
 newCell = newRow.insertCell(0);
 newCell.style.backgroundColor = blue_background;
 newCell.innerHTML = 'Cubic Wing Loading:';
 newCell = newRow.insertCell(1);
 newCell.style.backgroundColor = blue_background;
 newCell.innerHTML = msg;

 if(resulttype == "brief"){
	y3[0].innerHTML="<center><input class='clickbtn' type='button' value='Show More Results' onclick='show_full_results()'></center>";
 }else if (resulttype == "extended"){
	var z = myDoc.getElementById('Xmore_results_table').rows;
	var w2 = z[0].cells;
	var w3 = z[1].cells;
  	var w4 = z[2].cells;
	var iindex;
	var ncols = 7;

	for(iindex = 0; iindex <= ncols; iindex++){
		//function set_cell_color(cellid,index,color){
		set_cell_color(w3,iindex,"#7ab6e0");
		set_cell_color(w4,iindex,"#7ab6e0");
	}
	if(nprops == 0){  /*no props found */
   		w2[0].style.backgroundColor=warning_background;
   		w2[0].innerHTML = "Sorry, could not find any suitable props. Try changing some values.";

		for(iindex = 0; iindex <= 6; iindex++){
			set_cell_color(w3,iindex,"#b6d0e2");
			set_cell_color(w4,iindex,"#b6d0e2");
		}
   		return;
  	}

	w2[0].style.backgroundColor="#7ab6e0";
  	w2[0].innerHTML = "<center><b>Suggested Prop Sizes (approx):</b></center><i>For direct-drive, use props with gear ratio 1.00.<br>Adjust current and/or pitch speed if necessary to obtain this ratio.</i><br>&nbsp;<br><font color='#ffffff'>White: </font><i>propeller with most thrust.</i><br><font color='#ffff33'>Yellow: </font><i>best choice for direct-drive.</i>"

	var t1;
	var msgdia = "";
	var msgptch = "";
	var msgrpm = "";
	var msg_proptype = "";
	var msg_pitch_speed = "";
	var msg_thrust = "";
	var font_color = "#000000";
	var font1_color = "";
	var font2_color = "";
	var msg_gear_ratio = "";
	var msg_delta_thrust = "";
	var delta_thrust = 0;
	
	if(plane.units == "metric"){
		w3[0].innerHTML = "Prop<br>Type";
		w3[1].innerHTML = "Dia<br>(in)";
		w3[2].innerHTML = "Pitch<br>(in)";
		w3[3].innerHTML = "RPM";
		w3[4].innerHTML = "Vpitch<br> (kmph)";
		w3[6].innerHTML = "Thrust<br>Change";
		w3[7].innerHTML = "Approx<br>Gear Ratio";
		if(plane.n_motors == 1){
			w3[5].innerHTML = "Thrust<br>(gm)";
		}else{
			w3[5].innerHTML = "Thrust<br>per prop.<br>(gm)";
		}

		for(t1 = 0; t1 < nprops; t1++){
			if(t1 == best_thrust_index){
				font1_color = "#ffffff";		//highlight best prop thrust in bright white
				font2_color = "#000000";
				if((t1==best_outrunner_index)&&(Math.abs(prop_list[t1].gear_ratio-1.0) <= 0.05)){	//best thrust prop also has 1.0 gear ratio
					font2_color = "#ffff33";
				}
			}else if( (t1 == best_outrunner_index) && (Math.abs(prop_list[t1].gear_ratio-1.0) <= 0.05)){	//highlight prop best for direct drive
				font1_color = "#000000";
				font2_color = "#ffff33";
			}else{
				font1_color = font_color;
				font2_color = font_color;
			}
			delta_thrust = prop_list[t1].thrust - prop_list[best_thrust_index].thrust;	//thrust loss compared to best prop
			delta_thrust = (delta_thrust*1000).toFixed(1);
			msg_proptype +=  "<font color=\"" + "#000000" + "\">" + prop_list[t1].type + "</font><br>";	//propeller type
			msgdia +=  "<font color=\"" + font_color + "\">" + ((prop_list[t1].dia*39.37007874).toFixed(1)) + "</font><br>";
			msgptch +=  "<font color=\"" + font_color + "\">" + (prop_list[t1].pitch*39.37007874).toFixed(1) + "</font><br>";
			msgrpm +=  "<font color=\"" + font_color + "\">" + (prop_list[t1].rpm).toFixed(0) + "</font><br>";
			msg_pitch_speed +=  "<font color=\"" + font_color + "\">" + (prop_list[t1].pitch_speed * 3.6).toFixed(1) + "</font><br>";  //convert m/S to kmph 
			msg_thrust +=  "<font color=\"" + font1_color + "\">" + (prop_list[t1].thrust*1000).toFixed(1) + "</font><br>";
			msg_gear_ratio +=  "<font color=\"" + font2_color + "\">" + prop_list[t1].gear_ratio + "</font><br>";
			msg_delta_thrust +=  "<font color=\"" + font_color + "\">" + delta_thrust + "</font><br>";
		}
		w4[0].innerHTML = msg_proptype;
		w4[1].innerHTML = msgdia;
		w4[2].innerHTML = msgptch;
		w4[3].innerHTML = msgrpm;
		w4[4].innerHTML = msg_pitch_speed;
		w4[5].innerHTML = msg_thrust;
		w4[6].innerHTML = msg_delta_thrust;
		w4[7].innerHTML = msg_gear_ratio;

	}else if(plane.units == "imperial"){
		w3[0].innerHTML = "Prop<br>Type";	
		w3[1].innerHTML = "Dia<br>(in)";	
		w3[2].innerHTML = "Pitch<br>(in)";	
		w3[3].innerHTML = "RPM";
		w3[4].innerHTML = "Vpitch<br> (mph)";
		w3[6].innerHTML = "Thrust<br>Change";
		w3[7].innerHTML = "Approx<br>Gear ratio";
		if(plane.n_motors == 1){
			w3[5].innerHTML = "Thrust<br>(Oz)";
		}else{
			w3[5].innerHTML = "Thrust<br>per prop.<br>(Oz)";
		}

		for(t1 = 0; t1 < nprops; t1++){
//			alert("1140: t1 = " + t1 + "; best_thrust_indx = " + best_thrust_index + "; best_outrunner_indx = " + best_outrunner_index);
			if(t1 == best_thrust_index){
				font1_color = "#ffffff";		//highlight best prop thrust in bright white
				font2_color = "#000000";
				if((t1==best_outrunner_index)&&(Math.abs(prop_list[t1].gear_ratio-1.0) <= 0.05)){	//best thrust prop has 1.0 gear ratio
					font2_color = "#ffff33";
				}
			}else if( (t1 == best_outrunner_index) && (Math.abs(prop_list[t1].gear_ratio-1.0) <= 0.05 ) ) {
				font1_color = "#000000";
				font2_color = "#ffff33";
			}else{
				font1_color = font_color;	//reset to default font color
				font2_color = font_color;
			}
			delta_thrust = prop_list[t1].thrust - prop_list[best_thrust_index].thrust;	//thrust increase compared to smallest prop
			delta_thrust = (delta_thrust*1000/28.35).toFixed(1);
			msg_proptype += "<font color=\"" + font_color + "\">" + prop_list[t1].type + "</font><br>";//propeller type, Thin Electric, Slow Flyer, etc
			msgdia += "<font color=\"" + font_color + "\">" + ((prop_list[t1].dia*39.37007874).toFixed(1)) + "</font><br>";
			msgptch += "<font color=\"" + font_color + "\">" + (prop_list[t1].pitch*39.37007874).toFixed(1) + "</font><br>";
			msgrpm += "<font color=\"" + font_color + "\">" + (prop_list[t1].rpm.toFixed(0)) + "</font><br>";
			msg_pitch_speed += "<font color=\"" + font_color + "\">" + (prop_list[t1].pitch_speed * 2.25).toFixed(1) + "</font><br>";  //convert m/S to mph
			msg_thrust += "<font color=\"" + font1_color + "\">" + ((prop_list[t1].thrust)*1000/28.35).toFixed(1) + "</font><br>";
			msg_gear_ratio += "<font color=\"" + font2_color + "\">" + prop_list[t1].gear_ratio + "</font><br>";
			msg_delta_thrust += "<font color=\"" + font_color + "\">" + delta_thrust + "</font><br>";
		}
		w4[0].innerHTML = msg_proptype;
		w4[1].innerHTML = msgdia;
		w4[2].innerHTML = msgptch;
		w4[3].innerHTML = msgrpm;
		w4[4].innerHTML = msg_pitch_speed;
		w4[5].innerHTML = msg_thrust;
		w4[6].innerHTML = msg_delta_thrust;	
		w4[7].innerHTML = msg_gear_ratio;
	}else{
		alert("Wrong units" + plane.units + "in show_results line 1156");
	}
}else{
 	alert("Unknown result type in function show_results(), line 1159");
}
	return;
}
/*-------------------------------*/
function set_cell_color(cellid,index,color){
	cellid[index].style.backgroundColor=color;
	return;
}
/*-------------------------------*/
function show_full_results(){
 	var unitstype = document.getElementById("formunits").value;  /*metric or imperial?*/
	show_results(document,unitstype,"extended"); /*show extended results */
}
/*-------------------------------*/
function clear_extended_results(){
	var z = document.getElementById('more_results_table').rows;
	var w2 = z[0].cells;
	w2[0].innerHTML = "";
	var w3 = z[1].cells;
	var w4 = z[2].cells;
	var iindex;

	for(iindex = 0; iindex <= 7; iindex++){
		//function set_cell_color(cellid,index,color){
		set_cell_color(w3,iindex,"#b6d0e2");
		set_cell_color(w4,iindex,"#b6d0e2");
		w3[iindex].innerHTML = "";
		w4[iindex].innerHTML = "";
	}
	return;
}
/*-------------------------------*/
function flying_style(myplane){
/*	alert("in flying_style(): myplane.auw = " + myplane.auw ); */
	var fs;
	var wldg = myplane.cubic_wing_loading;
	/*by odd coincidence, gm/dm^3 works out numerically to almost exactly the same as oz/ft^3 ! */
	if( wldg <= 0.375){
		fs = "Thistledown";
	}else if((wldg > 0.375) && (wldg <= 0.75)){
		fs = "Feather";
	}else if((wldg > 0.75) && (wldg <= 1.5)){
		fs = "Paper plane"
	}else if((wldg > 1.5) && (wldg <= 2.5)){
		fs = "Very slow parkflyer"
	}else if((wldg > 2.5) && (wldg <= 3.5)){
		fs = "Slow small-field parkflyer"
	}else if((wldg > 3.5) && (wldg <= 5.5)){
		fs = "Sailplane/ parkflyer"
	}else if((wldg > 5.5) && (wldg <= 7.5)){
		fs = "Faster sailplane/ parkflyer"
	}else if((wldg > 7.5) && (wldg <= 9.5)){
		fs = "Trainer/ sport plane"
	}else if((wldg > 9.5) && (wldg <= 11.5)){
		fs = "Fairly fast scale model";
	}else if((wldg > 11.5) && (wldg <= 13.5)){
		fs = "Pylon racer";
	}else if((wldg > 13.5) && (wldg <= 16.5)){
		fs = "Jet/ electric ducted fan"
	}else if((wldg > 16.5) && (wldg <= 18.5)){
		fs = "Lead sled."
	}else if(wldg > 18.5){
		fs = "Brick!"
	}
	return fs;
}
/*-------------------------------*/
function flying_style2(myplane){
//Information on classing model aircraft using cubic wing loading based partly on information
//found here: http://hometown.aol.com/kmyersefo/ampnov05/ampnov05.htm#CUBE

//Larry Renegers very useful article on "3D wing loading" from Model Airplane News provided
//some useful formulae, see http://www.findarticles.com/p/articles/mi_qa3819/is_199712/ai_n8772261

	var fs;		//flying style
	var skill;	//pilot skill level
	var wldg = myplane.cubic_wing_loading;
	/*by odd coincidence, gm/dm^3 works out numerically to almost exactly the same as oz/ft^3 ! */

/* 10/2/2009 - re-estimate cubic wing loading for some categories
65" ws, 80 oz, 750 sq in Sky Raider Mach II glow trainer; cwl =	 5.83
65" ws, 90 oz, 750 sq in Sky Raider Mach II glow trainer; cwl = 6.57
	96 oz							7.00 
 */

	if( wldg <= 0.375){
		fs = "Thistledown.";
		skill = "No skill required.";
	}else if((wldg > 0.375) && (wldg <= 0.75)){
		fs = "Feather.";
		skill = "Extremely easy to fly.";
	}else if((wldg > 0.75) && (wldg <= 1.5)){
		fs = "Paper plane."
		skill = "Very easy to fly.";
	}else if((wldg > 1.5) && (wldg <= 3.0)){
		fs = "Indoor flyer.";
		skill = "Easy Beginner level.";
	}else if((wldg > 3.0) && (wldg <= 5.0)){
		fs = "Backyard Flyer / Light Park Flyer.";
		skill = "Beginner level.";
	}else if((wldg > 5.0) && (wldg <= 7.0)){
		fs = "Heavy Park Flyer / Light Glow Trainer.";
		skill = "Basic Intermediate.";
	}else if((wldg > 7.0) && (wldg <= 9.0)){
		fs = "Advanced Glow Trainer.";
		skill = "Intermediate.";
	}else if((wldg > 9.0) && (wldg <= 11.0)){
		fs = "Fast Aerobatic/Sport model";
		skill = "Advanced Intermediate.";
	}else if((wldg > 11.0) && (wldg <= 13.0)){
		fs = "Heavy Aerobatic/Sport model";
		skill = "Advanced.";
	}else if((wldg > 13.0) && (wldg <= 15.0)){
		fs = "Heavy Warbird";
		skill = "Expert.";
	}else if((wldg > 15.0) && (wldg <= 17.0)){
		fs = "Pylon Racer";
		skill = "Skilled Expert.";
	}else if((wldg > 17.0) && (wldg <= 19.0)){
		fs = "Lead sled";
		skill = "Highly Skilled Expert.";
	}else if(wldg > 19.0){
		fs = "Brick!";
		skill = "Probably unflyable.";
	}
	myplane.skill_level = skill;	//required pilot skill level
	return fs;
}
/*-------------------------------*/
function power_level(myplane,best_thrust){
	var pl = "dunno";
	
	var W = myplane.auw;  /*in grams */
	W /= 1000.0; /*convert W to kg */

	var P = myplane.motor_output_power * myplane.n_motors; /* in watts */
	var Vstall_kmhr = myplane.stall_speed;
	var Vstall_ms = Vstall_kmhr / 3.6;
	var Vpitch_min	= myplane.min_pitch_speed / 3.6;	//convert from kmph to m/S	
	var Vpitch_max	= myplane.max_pitch_speed / 3.6;	//same as above
//	alert("Line 505, Vpmin = " + Vpitch_min + " , Vpmax = " + Vpitch_max);

	var Vpitch_avg = (Vpitch_min + Vpitch_max)/2;  /* Average of recommended pitch speeds */
	
	var Thrust = P/Vpitch_avg;  /*using power = force x velocity, find force corresp P watts at Vpitch velocity */
	
	Thrust /= 9.81;   /*convert thrust from Newtons to kg */
//	alert("Thrust at 100% efficiency, at pitch speed = " + Thrust*1000.0/28.35);

	Thrust *= 0.85;   /*prop efficiency - 85% ballpark effiency? */

	Thrust *= 1.67;		//matches experimental data for APC 12x8 TE at 6150 rpm, GWS HD 11x7 at 34 mph pitch speed.
	
	Thrust = best_thrust * myplane.n_motors;
//	alert("Line 604, thrust for " + myplane.n_motors + " motors is " + Thrust);

//	alert("Line 576, Thrust = " + Thrust.toFixed(2) + "kg,, or " + Thrust*1000.0/28.35 + "oz.");
	 
	var beta = Thrust/W; /* Beta is a dimensionless ratio, thrust in kg / weight in kg. Decides climbout angle */

	var theta_max;

	theta_max = 90.0;	//vertical climbout

	/* If beta > W, the plane can hover and/or climb out vertically. Otherwise, asin((thrust-drag)/weight) gives the climbout angle.
		Assuming a glide ratio of 5:1, that translates to roughly asin(thrust/W - 0.2)  */

	if(beta > 4.0){
		pl = "Insane overkill. <br>Thrust/weight about " + beta.toFixed(1) + ":1";
	}else if((beta > 2.5) && (beta <= 4.0)){
		pl = "Incredible. Wild 3D. <br>Thrust/weight about " + beta.toFixed(1) + ":1";
	}else if((beta > 2.0 )&&(beta <= 2.5)){
		pl = "Amazing. Extremely 3D capable.<br>Thrust/weight about " + beta.toFixed(1) + ":1";
	}else if((beta > 1.5 )&&(beta <= 2.0)){
		pl = "Outstanding. Hovers with ease.<br>Thrust/weight about " + beta.toFixed(1) + ":1";
	}else if((beta > 1.25 )&&(beta <= 1.5)){
		pl = "Excellent. Unlimited vertical. Can hover.<br>Thrust/weight about " + beta.toFixed(1) + ":1";
	}else if((beta >= 1.0)&&(beta <= 1.25)){
		pl = "Excellent. Long vertical lines.<br> Might hover.<br>Thrust/weight about " + beta.toFixed(1) + ":1";
	}else if((beta < 1) && (beta >= 0.167)){ /*beta is less than 1 but enough to overcome drag, calculate climbout angle and use that as performance indicator */
//		theta_max = Math.asin(beta - 0.167) * 180/Math.PI;	/*This is the estimated climbout angle, assuming a 5:1 glide ratio. */
//		var tmsg = "Climbout angle = " + theta_max.toFixed(1) + " degrees.\n";
//		alert(tmsg);
		theta_max = Math.asin(beta - 0.05) * 180/Math.PI;	/*closer to real world observations July 7 2008*/

		myplane.climbout_angle = theta_max;
		if(theta_max > 80){
			pl = "Goes almost vertical.<br>" + ((myplane.climbout_angle/10).toFixed(0)*10) + " degree climbouts.";
		}else if((theta_max > 60) && (theta_max <= 80)){
			pl = "Aerobatic.<br>" + ((myplane.climbout_angle/10).toFixed(0)*10) + " degree climbouts.";
		}else if((theta_max > 40) && (theta_max <= 60)){
			pl = "Medium/Mild aerobatics.<br>" + ((myplane.climbout_angle/10).toFixed(0)*10) + " degree climbouts.";
		}else if((theta_max > 30) && (theta_max <= 40)){
			pl = "Mild aerobatics.<br>" + ((myplane.climbout_angle/10).toFixed(0)*10) + " degree climbouts.";
		}else if((theta_max > 20) && (theta_max <= 30)){
			pl = "Very Mild aerobatics.<br>" + ((myplane.climbout_angle/10).toFixed(0)*10) + " degree climbouts.";
		}else if((theta_max > 10) && (theta_max <= 20)){
			pl = "Marginal or No aerobatics.<br>" + ((myplane.climbout_angle/10).toFixed(0)*10) + " degree climbouts.";
		}else if((theta_max > 0) && (theta_max <= 10)){
			pl = "Marginal power. Barely flies.<br>" + ((myplane.climbout_angle/5).toFixed(0)*5) + " degree climbouts.";
		}else if(theta_max < 10){
			pl = "Insufficient power or no prop found.";
		}else{
			alert("I don't understand this thrust to weight ratio: " + beta + " in function power_level()");
			pl = "unknown";
		}
	}else{	//beta < 0.167
		pl = "Insufficient power or no suitable prop found.<br>Won't fly.";
	}
	return pl;
}

/*--------------------------------*/
function find_prop_size_v2(prop_list,myplane)
{
//APC SF props, data from Martyn Mckinney
// dia (inches), pitch (inches), constant K
// power(watts) = K P D^4 RPM^3 x 5.33e(-15)
// thrust(oz) = K P_eff D^3 RPM^2 x 1.1e(-10)

//props with K of 1.2500 are guesswork - no data was available from Martyn Mckinney for these props
var apc_sf_props = 
[ 
{dia:7.0, pitch:4.0, K:0.88},
{dia:7.0, pitch:5.0, K:0.98},
{dia:8.0, pitch:3.8, K:1.15},
{dia:8.0, pitch:6.0, K:1.29},
{dia:9.0, pitch:3.8, K:1.19},
{dia:9.0, pitch:4.7, K:0.96},
{dia:9.0, pitch:6.0, K:1.24},
{dia:10.0, pitch:3.8, K:1.2500},
{dia:10.0, pitch:4.7, K:1.24},
{dia:10.0, pitch:7.0, K:1.28},
{dia:11.0, pitch:4.7, K:1.29},
{dia:11.0, pitch:7.0, K:1.2500},
{dia:12.0, pitch:3.8, K:1.2500},
{dia:12.0, pitch:4.7, K:1.2500},
{dia:12.0, pitch:6.0, K:1.2500},
{dia:12.0, pitch:8.0, K:1.2500},
{dia:13.0, pitch:4.7, K:1.2500},
{dia:14.0, pitch:4.7, K:1.2500}
];


//APC TE props, data from Martyn Mckinney
// dia (inches), pitch (inches), constant K
// power(watts) = K P D^4 RPM^3 x 5.33e(-15)
// thrust(oz) = K P_eff D^3 RPM^2 x 1.1e(-10)

//props with K:0.85555555555 are guesswork - no data was available from Martyn Mckinney for these props

var apc_te_props = 
[ 
{dia:4.75, pitch:4.75, K:0.879},
{dia:5.0, pitch:5.0, K:0.841},
{dia:5.1, pitch:4.5, K:1.562},
{dia:5.25, pitch:6.25, K:1.128},
{dia:5.5, pitch:4.5, K:0.752},
{dia:6.0, pitch:4.0, K:0.786},
{dia:6.0, pitch:5.5, K:0.88},
{dia:7.0, pitch:5.0, K:0.986},
{dia:8.0, pitch:4.0, K:1.086},
{dia:8.0, pitch:6.0, K:1.117},
{dia:8.0, pitch:8.0, K:1.148},
{dia:9.0, pitch:4.5, K:0.976},
{dia:9.0, pitch:6.0, K:0.983},
{dia:9.0, pitch:7.5, K:1.033},
{dia:10.0, pitch:5.0, K:0.941},
{dia:10.0, pitch:7.0, K:0.853},
{dia:10.0, pitch:10.0,K:0.8555555},
{dia:11.0, pitch:3.8, K:1.36},
{dia:11.0, pitch:5.5, K:0.855},
{dia:11.0, pitch:7.0, K:0.811},
{dia:11.0, pitch:8.0, K:0.8555555},
{dia:11.0, pitch:8.5, K:0.8555555},
{dia:11.0, pitch:10.0, K:0.8555555},
{dia:12.0, pitch:6.0, K:0.866},
{dia:12.0, pitch:8.0, K:0.817},
{dia:12.0, pitch:10.0, K:0.8555555},
{dia:12.0, pitch:12.0, K:0.8555555},
{dia:13.0, pitch:6.5, K:0.848},
{dia:13.0, pitch:8.0, K:0.761},
{dia:13.0, pitch:10.0, K:0.94},
{dia:14.0, pitch:7.0, K:0.75},
{dia:14.0, pitch:8.5, K:0.80},
{dia:14.0, pitch:10.0, K:0.8555555},
{dia:14.0, pitch:12.0, K:0.8555555},
{dia:15.0, pitch:4.0, K:0.8555555},
{dia:15.0, pitch:6.0, K:0.8555555},
{dia:15.0, pitch:7.0, K:0.8555555},
{dia:15.0, pitch:8.0, K:0.8555555},
{dia:15.0, pitch:10.0, K:0.8555555},
{dia:16.0, pitch:8.0, K:0.8555555},
{dia:16.0, pitch:10.0, K:0.8555555},
{dia:16.0, pitch:12.0, K:0.8555555},
{dia:17.0, pitch:8.0, K:0.8555555},
{dia:17.0, pitch:10.0, K:0.8555555},
{dia:17.0, pitch:12.0, K:0.8555555},
{dia:18.0, pitch:8.0, K:0.8555555},
{dia:18.0, pitch:10.0, K:0.8555555},
{dia:18.0, pitch:12.0, K:0.8555555},
{dia:19.0, pitch:8.0, K:0.8555555},
{dia:19.0, pitch:10.0, K:0.8555555},
{dia:19.0, pitch:12.0, K:0.8555555},
{dia:20.0, pitch:8.0, K:0.8555555},
{dia:20.0, pitch:10.0, K:0.8555555},
{dia:20.0, pitch:11.0, K:0.8555555},
{dia:20.0, pitch:12.0, K:0.8555555},
{dia:20.0, pitch:13.0, K:0.8555555},
{dia:20.0, pitch:15.0, K:0.8555555},
{dia:21.0, pitch:12.0, K:0.8555555},
{dia:21.0, pitch:13.0, K:0.8555555},
{dia:21.0, pitch:14.0, K:0.8555555},
{dia:22.0, pitch:10.0, K:0.8555555},
{dia:22.0, pitch:11.0, K:0.8555555},
{dia:22.0, pitch:12.0, K:0.8555555}
];

var gws_hd_props = 
[
{dia:2.5, pitch:0.8, K:0.75},
{dia:2.5, pitch:1.0, K:0.75},
{dia:3.0, pitch:2.0, K:0.75},
{dia:3.0, pitch:3.0, K:0.75},
{dia:4.0, pitch:2.5, K:0.75},
{dia:4.0, pitch:4.0, K:0.75},
{dia:4.5, pitch:3.0, K:0.75},
{dia:4.5, pitch:4.0, K:0.75},
{dia:5.0, pitch:3.0, K:0.75},
{dia:5.0, pitch:4.3, K:0.75},
{dia:6.0, pitch:3.0, K:0.75},
{dia:7.0, pitch:3.5, K:0.61},
{dia:8.0, pitch:4.0, K:0.81},
{dia:8.0, pitch:6.0, K:0.75},
{dia:9.0, pitch:5.0, K:0.86},
{dia:9.0, pitch:7.5, K:0.86},
{dia:10.0, pitch:6.0, K:0.72},
{dia:10.0, pitch:8.0, K:0.72},
{dia:11.0, pitch:7.0, K:0.8},
{dia:12.0, pitch:8.0, K:0.81}
];

//coeffs from Martyn Mckinney, except 14x10 prop is my guess.
var gws_rs_props =
[
{dia:6.0, pitch:5.0, K:1.17},
{dia:7.0, pitch:6.0, K:1.32},
{dia:8.0, pitch:4.3, K:1.06},
{dia:9.0, pitch:4.7, K:1.12},
{dia:9.0, pitch:7.0, K:1.18},
{dia:10.0, pitch:4.7, K:1.27},
{dia:10.0, pitch:8.0, K:1.32},
{dia:11.0, pitch:4.7, K:1.34},
{dia:11.0, pitch:8.0, K:1.24},
{dia:12.0, pitch:6.0, K:1.11},
{dia:12.0, pitch:8.0, K:1.21},
{dia:13.0, pitch:9.0, K:1.21},
{dia:14.0, pitch:7.0, K:1.06},
{dia:14.0, pitch:10.0, K:1.2000}
];

	var count;
	var prop_model;	//what make and model? Ex APC Thin Electric
	var thrust_fudge;

	var P_eff;	//effective pitch, for stalled props (P/D > 0.6)
	var max_prop_rpm;

	//Search for APC Thin Electric props that match the available power and required pitch speed.
	prop_model = "APC-TE";
	count = 0;
	max_prop_rpm = 190000;	//APC TE max rpm: 190000/dia_in_inches
	thrust_fudge = 0.83;	//0.83 for APC TE props from Dr. Kiwi thrust data and Martyn Mckinney prop power coeff
	thrust_fudge = 0.87;
	count = check_all_props_v2(prop_model,apc_te_props,thrust_fudge,max_prop_rpm,count,prop_list,myplane,"goodprops");
	
	//Search for APC Slow Flyer props that match the available power and required pitch speed.
	prop_model = "APC-SF";
	max_prop_rpm = 65000; // APC SF max rpm = 65000/dia_in_inches
	thrust_fudge = 0.87	//0.87 for APC SF props from Dr. Kiwi thrust data and Martyn Mckinney prop power coeff
	count = check_all_props_v2(prop_model,apc_sf_props,thrust_fudge,max_prop_rpm,count,prop_list,myplane,"goodprops");

	//Search for GWS HD or DD props
	prop_model = "GWS-HD";
	max_prop_rpm = 100000;	//this is what GWS claims - and it lets you put 500 W into a 13" GWS HD. I don't believe it!
	max_prop_rpm = 75000;
	thrust_fudge = 1.00;
	count = check_all_props_v2(prop_model,gws_hd_props,thrust_fudge,max_prop_rpm,count,prop_list,myplane,"goodprops");

	//Search for GWS RS props
	prop_model = "GWS-RS";
	max_prop_rpm = 50000;
	thrust_fudge = 1.00;
	count = check_all_props_v2(prop_model,gws_rs_props,thrust_fudge,max_prop_rpm,count,prop_list,myplane,"goodprops");

// if count is zero, no props were found. Do something intelligent...
	if(count == 0){
//		alert("1432: no props found!");
		var bad_prop_list = new Array(new prop_object_v2(-1,-1,-1,-1,-1,-1,-1));
		//Search for APC Thin Electric props that match the available power but not the required pitch speed.
		prop_model = "APC-TE";
		max_prop_rpm = 190000;	//APC TE max rpm: 190000/dia_in_inches
		thrust_fudge = 0.83;	//0.83 for APC TE props from Dr. Kiwi thrust data and Martyn Mckinney prop power coeff
		thrust_fudge = 0.87;
		badcount = 0;
		badcount = check_all_props_v2(prop_model,apc_te_props,thrust_fudge,max_prop_rpm,badcount,bad_prop_list,myplane,"badprops");
		
		//Search for APC Slow Flyer props that match the available power but not the required pitch speed.
		prop_model = "APC-SF";
		max_prop_rpm = 65000; // APC SF max rpm = 65000/dia_in_inches
		thrust_fudge = 0.87	//0.87 for APC SF props from Dr. Kiwi thrust data and Martyn Mckinney prop power coeff
		badcount = check_all_props_v2(prop_model,apc_sf_props,thrust_fudge,max_prop_rpm,badcount,bad_prop_list,myplane,"badprops");
	
		//Search for GWS HD or DD props
		prop_model = "GWS-HD";
		max_prop_rpm = 50000;
		thrust_fudge = 1.00;
		badcount = check_all_props_v2(prop_model,gws_hd_props,thrust_fudge,max_prop_rpm,badcount,bad_prop_list,myplane,"badprops");
	
		//Search for GWS RS props
		prop_model = "GWS-RS";
		max_prop_rpm = 35000;
		thrust_fudge = 1.00;
		badcount = check_all_props_v2(prop_model,gws_rs_props,thrust_fudge,max_prop_rpm,badcount,bad_prop_list,myplane,"badprops");
//		alert("1460: " + badcount + " props found with wrong pitch speed. Now search for best of them...");
//		alert("1463: Modify suggested pitch speed to consider prop size and suggest raised pitch speed, with a warning?");
		if(badcount != 0){	//one or more props were found where the pitch speed did not match the user requirements
			var target_pitch_speed = myplane.target_pitch_speed;
			var m = find_best_bad_prop(badcount,bad_prop_list,target_pitch_speed);
//-----prop_object has these properties--------
		//	this.type = proptype;
		//	this.dia = D;
		//	this.pitch = P;
		//	this.rpm = N;
		//	this.pitch_speed = Vp;
		//	this.thrust = T;
		//	this.gear_ratio
//--------------------
			var ptype, pdia, ppitch,bad_pitch_speed;

			ptype = bad_prop_list[m].type;
			pdia = bad_prop_list[m].dia;
			ppitch = bad_prop_list[m].pitch;
			bad_pitch_speed = bad_prop_list[m].pitch_speed;
			pgear_ratio = bad_prop_list[m].gear_ratio;
			pdia = pdia * 1000.0/25.4; //convert metres to inches
			ppitch = ppitch * 1000.0/25.4;
		
			var formunits = myplane.units;
			if(formunits == "imperial"){
				alert("There is no propeller that matches this combination of prop size, pitch speed, battery voltage, and motor Kv. The closest is a/an " + ptype + " " +  pdia.toFixed(1) + " x " + ppitch.toFixed(1) + " at a pitch speed of " + (bad_pitch_speed * 3600.0/(1000.0*1.6)).toFixed(2) + " mph" + " at a gear ratio of " + pgear_ratio + ".\n Try changing to this pitch speed and re-running the voltage, current, and Kv wizards.");
			}else if(formunits == "metric"){
				alert("There is no propeller that matches this combination of prop size, pitch speed, battery voltage, and motor Kv. The closest is a(n) " + ptype + " " +  pdia + " x " + ppitch + " at a pitch speed of " + (bad_pitch_speed * 3600.0/1000.0).toFixed(2) + "kmph" + " at a gear ratio of " + pgear_ratio + ".\n Try changing to this pitch speed and re-running the voltage, current, and Kv wizards.");
			}
		}else{
			//no props found at all - motor kv off?
			alert("No propellers found that match this combination of prop size, pitch speed, battery voltage, and motor Kv.\n Try raising the motor kv and re-running the voltage, current, and Kv wizards.");
		}
		return(0);
	}else{	//algorithm did find props meeting pitch speed, power, and size requirements...
		return(count);	//tell the rest of the code that no prop meeting all the requirements was found.
	}
}
/*--------------------------------*/
//new function to go through all props data and find those props that match the airframe requirements and motor power
//Jan 30, 2007 JC
function check_all_props_v2(prop_model,prop_coeffs,fudge,max_prop_rpm,count,prop_list,myplane,flag){
	var i;
	var prop_rpm;
	var propdia, proppitch, propK, power_to_prop;
	var prop_pitch_speed, prop_thrust;
	var Vpitch_target = myplane.target_pitch_speed;	 //target pitch speed in kmph
	var pd_to_span_max = 0.7;	//max prop diameter is 0.7 of wingspan...allows for GWS Ladybug, some indoor planes, etc.
	var pd_to_span;	//ratio of prop diameter to wingspan
	var gear_ratio;
	var D,P,Vp_ms;
	var dVp;
	var dVp_max = 0.1;	//include props with up to 10 % error in pitch speed 

	var A,B;
	power_to_prop = myplane.motor_output_power;

	for(i=0; i < prop_coeffs.length; i++){	//go through all the props of this particular family, ex APC SF
		propdia	= prop_coeffs[i].dia;

		if(propdia > myplane.max_prop_dia){	//skip props bigger than user asked for
			continue;
		}

		proppitch = prop_coeffs[i].pitch;
		propK = prop_coeffs[i].K;
		prop_rpm = find_prop_rpm(propdia,proppitch,propK,power_to_prop);
		prop_pitch_speed = find_prop_pitch_speed(proppitch,prop_rpm);
		dVp = Math.abs((Vpitch_target - prop_pitch_speed)/Vpitch_target);	//fractional error in pitch speed

		if(prop_rpm < max_prop_rpm/propdia){	//props mechanical rpm limit is not exceeded
			if(flag == "goodprops"){
				A = dVp;
				B = dVp_max;	
			}else if(flag == "badprops"){
				A = dVp_max;
				B = dVp;
			}else{
			 	alert("1473: flag unrecognized in function check_all_props_v2.");
			}
			if(A < B){	//if flag = "goodprops", find props where pitch speed error is within tolerable percentage
				if(myplane.n_motors == 1){				
					pd_to_span = (propdia * 25.4)/myplane.wing_span; /*prop dia to wingspan ratio, everything in mm*/
				}else{
					pd_to_span = (propdia * 25.4 * myplane.n_motors)/myplane.wing_span; /*make room for n motors - divide wingspan by n! */
				}

				if(pd_to_span <= pd_to_span_max){	//these props are small enough to work on this plane's wing
					prop_thrust = find_prop_thrust(propdia,proppitch,propK,prop_rpm,fudge);
					D = propdia * 25.4/1000.0; //convert to metres
					P = proppitch * 25.4/1000.0 
					Vp_ms = prop_pitch_speed * 1000.0/3600.0;
					gear_ratio = ((myplane.motor_rpm)/prop_rpm).toFixed(2);

					if(gear_ratio >= 0.8){
						prop1 = new prop_object_v2(prop_model,D,P,prop_rpm,Vp_ms,prop_thrust,gear_ratio);
						prop_list[count] = prop1;
//						alert("1551: prop_list[" + count + "]:" + " proptype: " + prop_list[count].type + " dia = " + prop_list[count].dia + "  pitch = " + prop_list[count].pitch + " rpm = " + prop_list[count].rpm  + "\n pitch_speed = " + prop_list[count].pitch_speed + "  thrust = " + prop_list[count].thrust + " gear_ratio =  " + prop_list[count].gear_ratio);
						count++; /*one more prop found*/
					}
				}
			}
		}	
	}
	return(count);
}
/*--------------------------------*/
// find the best of the props that did NOT meet the pitch speed requirement (for instance, prop max size too small so pitch speed too high)
function find_best_bad_prop(nprops,prop_list,target_pitch_speed){
//	alert("1540: Entered find_best_bad_prop.");
	var i, best_i, pitch_speed, min_delta, delta;
	if(nprops == 0){	//there were no suitable props found
		pitch_speed = 0;
	}else{
		pitch_speed = prop_list[0].pitch_speed;	//metres per sec
		pitch_speed *= 3600.0/1000.0;	//kmph
	}
	min_delta = Math.abs((pitch_speed - target_pitch_speed)/target_pitch_speed);
	best_i = 0;
	for(i = 1; i < nprops; i++){
		pitch_speed = prop_list[i].pitch_speed;
		pitch_speed *= 3600.0/1000.0;	//kmph
				
		delta = Math.abs((pitch_speed - target_pitch_speed)/target_pitch_speed);
		if(delta < min_delta){
			best_i = i;	//i-th propeller in the list has best thrust	
			min_delta = delta;
		}
	}
//	alert("1556: Best_i is " + best_i + ", min_delta = " + (min_delta).toFixed(2));
	return best_i;
}
/*-------------------------------*/
//calculate prop thrust in Kg given dia, pitch,prop constant, prop rpm, fudge factor
//Jan 30, 2007 JC
function find_prop_thrust(dia,pitch,K,rpm,fudge){
	var thrust_kg;
	var thrust_oz;
	var p_eff;
// prop static thrust(oz) = K P_eff D^3 RPM^2 x 1.1e(-10), where p_eff allows for high P/D props having proportionately less thrust
	p_eff = prop_effective_pitch(pitch,dia);
	thrust_oz = K * p_eff * dia * dia * dia * rpm * rpm * 1.1e-10 * fudge;	//fudge is nominally 1.0, adjust to connect Cp and Ct for each different prop family.
	thrust_kg = thrust_oz * 28.35/1000.0;
	return thrust_kg;
}
/*--------------------------------*/
//function to find the pitch speed of a propeller, given rpm and pitch
//Jan 30, 2007 JC
function find_prop_pitch_speed(pitch,rpm){
	var pitch_speed;
	pitch_speed = pitch * rpm/1056;  //prop pitch speed in mph
//	pitch_speed *= 1.609 * 1000.0/3600.0;	//convert mph to metres/sec
	pitch_speed *= 1.609;	//pitch speed in kmph
	return pitch_speed;
}
/*--------------------------------*/
//function to find at what rpm a specified propeller absorbs a specified amount of power
//Jan 30, 2007 JC
function find_prop_rpm(dia,pitch,K,power){
	var prop_rpm = 0.0;
// prop absorbed power(watts) = K P D^4 RPM^3 x 5.33e(-15)
// prop static thrust(oz) = K P_eff D^3 RPM^2 x 1.1e(-10)

// rearrange power equation to get:
//prop rpm^3 = power/(K P D^4 x 5.33e(-15); take cube root of RHS to get rpm at which this prop absorbs this much power.
	var rpm_cubed = power/(K*pitch*dia*dia*dia*dia*5.33e-15);
	prop_rpm = Math.pow(rpm_cubed,0.333333333333);
	return prop_rpm;
}
/*--------------------------------*/
function prop_effective_pitch(P,D){
	var alpha = P/D;
	var P_eff;

	if(alpha > 0.67){	//prop is stalled when static, effective pitch is 0.67 x D no matter what geometric pitch is
		P_eff = 0.67 * D;
	}else{
		P_eff = P;
	}
	return P_eff;
}
/*--------------------------------*/
function prop_object_v2(proptype,D,P,N,Vp,T,grr){
	this.type = proptype;
	this.dia = D;
	this.pitch = P;
	this.rpm = N;
	this.pitch_speed = Vp;
	this.thrust = T;
	this.gear_ratio = grr;
 return;
}
/*--------------------------------*/
function showmotordata(dummy){
/* alert("in showmotordata! ");  */

 var x = document.getElementById('datatable').rows;
 var y=x[0].cells;
 y[1].style.backgroundColor="#00dddd"; /*change background color of cell*/

 alert("close this to load the iframe...");
 y[1].innerHTML="<iframe name='floater' src='rosebox.html' width='500' height='390' frameborder='1'></iframe>";
 return;
}
/*------------------------------------*/
/*June 24, 2008 */
function show_help_page(pageURL){
//	alert("1563 - closing help cell...");
//commented out 9/28/08 - see if this solves prob of not working within website frameset...WORKS!
//	close_helpcell();
//	alert("1565: finished closing help cell, about to show help page " + pageURL);
	var x = document.getElementById('outertable').rows;
//	alert("1567: doc.getElt(outertable).rows = " + x);
	var y1=x[1].cells;
//	alert("1569: outertable.cells = " + y1);
//	alert("1570: about to change cell background colour.<br>");
	y1[1].style.backgroundColor="#b6d0e2"; /*change background color of cell*/
//	alert("1572: calling iframe...");
	var framehtml = "<iframe name='helpframe' src='" + pageURL +"' width='300px' height='550px' frameborder='0' scrolling='no'></iframe>";
//	alert("1574: framehtml = " + framehtml);
//	alert("1575: setting y1[1].innerHTML...");

//may 14 09
	y1[1].innerHTML= framehtml;
//	y1[1].innerHTML= "<p>New paragraph....</p>";

//	alert("1577: done setting y1[1].innerHTML. ");
	return;
}
/*-------------------------------------------------*/
function close_helpcell(myDoc){
/*0000000000
	var x = myDoc.getElementById('outertable').rows;
	var y1=x[0].cells;
	y1[1].style.backgroundColor="#b6d0e2";
	y1[1].innerHTML="";
	y1[1].width = "0";
	return;
000000000000*/

//+++++++++++++++++++++++++++++++++++++++++++
//Nov 2009 JC
//dynamically delete help cell and any cells to right of it.
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get outermost table body, containing all WebOCalc panes
	var newCell, newRow, html_string, n;

	newRow = tblBody.rows[0];		//access first row in 'outertable'
	var ncells = newRow.cells.length;	//find out length of row..

	//remove all but the leftmost WebOCalc pane - delete other cells in outertable
	for(n=ncells-1; n > 0; n--){
		myDoc.getElementById('outertable').rows[0].deleteCell(n);
	}
//	newCell = newRow.insertCell(-1);	//tack on a new cell to the end of the row
//++++++++++++++++++++++++++++++++++++++++++++
}
/*-------------------------------------------------*/
function find_pack_voltage(myDoc){
	var cellvolts, packvoltage;
	var celltype = myDoc.getElementById('celltype').value;
	var cellcount = parseInt(myDoc.getElementById('cellcount').value);
	if(celltype == "nimh"){
		packvoltage = V_nimh_cell * cellcount;
	}else if(celltype == "a123"){
		packvoltage = V_A123_cell * cellcount;
	}else{
		alert("1995: Unknown battery type!");
	}
	myDoc.getElementById('vbat').value = packvoltage.toFixed(2);
//	alert("1998: cellvolts = " + cellvolts + " cellcount = " + cellcount + " vbat = " + packvoltage);
	return packvoltage;
}
/*-------------------------------------------------*/
//read values returned from voltage wizard, and use them to update the battery type, cell count,
//pack voltage, and current draw entries in the main WebOCalc pane.
function update_batt(myDoc){
//	alert("2033: in update_batt.")

// trying out getElementsByName - should allow multiple elements w same name, like this radio button. Works!

//Try  document.formName.radioButtonName: If you know the name of the radio button, you can access the entire group of radio buttons via document.formName.radioButtonName.
//This will yield an array that you can loop through to find the one with .selected=true, and then you can take the .value attribute //from that one.
//JGC = both getElementsByName() and document.formName.radioButtonName worked. 
//JGC - for WebOCalc, main form name is:  id="wcmain" name="wcmain">

	
	var btn = document.getElementsByName('batpick');	//This works
//	var btn = document.wcmain.batpick;			//This also works.
	var nchoices = btn.length;
//	alert("2036: nchoices = " + nchoices);
	var i, battinfo;
	//read list of comma-separated values returned from 'batpick' radio button
	for(i = 0; i < nchoices; i++){
		if(btn[i].checked){
			battinfo = btn[i].value;
			break;
		}
	}	
	var btype,count,mAh,Vbat,Ibat;
	//split comma-separated list into individual values, assign each to a variable
	var vals = battinfo.split(',');
	btype = vals[0];	//nimh or A123
	count = vals[1];	//# series cells
	mAh = vals[2];		//mAh capacity of cell
	Vbat = vals[3];		//pack voltage
	Ibat = vals[4];		//pack current draw

	var myDoc = document;
	//use values returned from batpick radio button to update main left-hand WebOCalc pane.
	myDoc.getElementById('vbat').value = Vbat;
	var n_motors = parseInt(myDoc.getElementById('n_motors').value);
	myDoc.getElementById('motor_current').value = Ibat/n_motors;
	myDoc.getElementById('motor_current').style.backgroundColor = "#ffffff"; /*restore background to white */

	//update battery type on main WebOCalc pane
	if(btype == "Lipo"){
		myDoc.getElementById('celltype').selectedIndex = 0;
	}else if(btype == "A123"){
		myDoc.getElementById('celltype').selectedIndex = 1;
	}
	//update cell count on main WebOCalc pane
	myDoc.getElementById('cellcount').selectedIndex = count-1;
	return;
}
//------------------------------------------------------------------------
function open_next_cell(myDoc){
	alert("2099:in open_next_cell.");
	// Dynamically add rows/cells to the table and write into them
	var tblBody = myDoc.getElementById('outertable').tBodies[0];	//get table body
	var newCell, newRow;
	var html_string;
	var yellow_background = "#ffdddd";

	newRow = tblBody.rows[0];		//access second row - topmost one contains "WebOCalc x.y" heading.
	var ncells = newRow.cells.length;
	var n = ncells + 1;
	newCell = newRow.insertCell(-1);
	newCell.style.backgroundColor = yellow_background;
	newCell.innerHTML = 'Pinkie!';
	return;
}
/*
     FILE ARCHIVED ON 13:15:46 Mar 26, 2016 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 02:14:07 Nov 03, 2017.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
