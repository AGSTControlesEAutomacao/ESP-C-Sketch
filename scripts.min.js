/**
 * Carrega o menu de navegação.
 */
function ajaxMenu() {
	$("#menu-nav").html('<ul class="menu waiting"></ul>'); //Coloca um placeholder em quanto carrega
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "menu.html",
			type: "GET",
			dataType: "text",
			success: (response) => {
				let actualLevel = parseInt(document.cookie.split("|")[2]); //Pega o nivel de acesso no Cookie
				$("#menu-nav").html(response);

				//Bloqueia os menus inacessiveis
				let menuItens = $("#menu-nav a");
				for (let i = 0; i < menuItens.length; i++) {
					let el = $(menuItens[i]);
					if ((el.attr("level") ?? 99999999) < actualLevel) {
						el.removeAttr("href");
						el.attr("class", "menubloq");
					}
				}
				//Abre menu se usuario tiver aberto-o
				if (sessionStorage.getItem('menu') == 'opened')
					openCloseMenu('opened');

				//Adiciona as notificações em todas telas que possuem o menu.
				ajaxNotification();

				resolve();
			},
			statusCode: {
				401: () => {
					reject("Sessão Encerrada, realize login novamente.");
				},
				403: () => {
					reject("Sem acesso, realize login novamente.");
				}
			},
			error: (error) => {
				console.error("Erro na requisição AJAX:", error);
				reject(error);
			}
		});
	});
}

/**
 * Solicita de tempos em tempos as notificações para coloca-las no icone das paginas.
 */
async function ajaxNotification() {
	await new Promise((resolve, reject) => {
		$.ajax({
			url: "activealerts",
			type: "POST",
			dataType: "json",
			success: (response) => {
				let el = $('.ntf');
				if (response.totais > 0) {
					el.text(response.totais);
					el.css('display', '');
				}
				else {
					el.css('display', 'none');
				}

				resolve(response);
			},
			statusCode: {
				401: () => {
					reject(401);
				},
				403: () => {
					reject(403);
				},
				500: () => {
					reject(500);
				}
			},
			error: (err) => {
				console.error("Erro na requisição AJAX:", err);
				reject(err);
			}
		});

	})

	setTimeout(ajaxNotification, 10000);
}

/**
 * Altera o estado atual do menu.
 * 
 * @param {string} forceOpen forçar que fique aberto 
 */
function openCloseMenu(forceOpen) {
	if (!$("nav").hasClass("active") || forceOpen == 'opened') {
		$("body").addClass("menu-x");
		$("nav").addClass("active");
		$("header").addClass("active");
		if (window.innerWidth > 480)
			sessionStorage.setItem('menu', 'opened');
	}
	else {
		$("body").removeClass("menu-x");
		$("nav").removeClass("active");
		$("header").removeClass("active");
		sessionStorage.setItem('menu', 'closed');
	}
}

/**
 * Transforma um formulario em JSON para envio via POST
 * 
 * @param {object} jQueryForm Formulario em formato objeto jQuery
 * @returns JSON contendo os nomes dos elementos como key
 */
function formToJson(jQueryForm) {
	let toReturn = {};
	for (let el of jQueryForm[0]) {
		switch (el.tagName) {
			case 'INPUT':
				if (el.type == 'text' || el.type == 'number' || el.type == 'password' || el.type == 'url') {
					toReturn[el.name] = el.value;
				} else if (el.type == 'checkbox') {
					toReturn[el.name] = el.checked;
				}
				break;
			case 'SELECT':
				toReturn[el.name] = el.value;
				break;
		}
	}
	return toReturn;
}

/**
 * 
 * @param {*} evt Evento do onchange (Não usado)
 * @param {object} el Elemento em formato Objeto jQuery a qual deixar em evidencia quando alterar.
 */
function changeField(evt, el) {
	if (el.attr('type') == 'checkbox') {
		if (el.attr('initial-value') != (el[0].checked ? "true" : "false")) { //Não tirar os parenteses pois o JS considera a comparação != com precedencia maior ao Ternario
			$('.msg-alrt').addClass('act');
			el.addClass('chg');
		}
		else {
			el.removeClass('chg');
		}
	}
	else if (el.attr('type') == 'radio') {
		for (let jsEl of el) {
			let jEl = $(jsEl);
			if (jEl.attr('initial-value') == jEl.val() && jEl.prop('checked')) {
				el.removeClass('chg');
				break; //Ta clicado no elemento inicial então sai fora pra não deixar vermelho
			}
			else {
				$('.msg-alrt').addClass('act');
				el.addClass('chg');
			}
		}
	}
	else {
		if (el.attr('initial-value') != el.val()) {
			$('.msg-alrt').addClass('act');
			el.addClass('chg');
		}
		else {
			el.removeClass('chg');
		}
	}

	checkChanges();
}

/**
 * Verifica se não tem mais alterações na pagina e tira os botões de send.
 */
function checkChanges() {
	if (!$('input').hasClass('chg') && !$('select').hasClass('chg')) {
		$('.msg-alrt').removeClass('act');
	}
}

/**
 * Varre todos os checkboxes da pagina para habilitar o campo escondido equivalente se o mesmo for desmarcado.
 */
function checkBoxListener() {
	let chkBoxes = $("input:checkbox")
	for (let el of chkBoxes) {
		let jEl = $(el);
		let hidJEl = $(`#${jEl.attr('id')}-hidden`);
		if (jEl.prop('checked') == true)
			hidJEl.attr('disabled', true);
		else
			hidJEl.removeAttr('disabled');
	}
}

/**
 * Recarrega a pagina sem dar submit
 */
function resetfrm() {
	$(window).unbind("beforeunload"); //Desativa o evento de descarregamento ao enviar resetar form.
	window.location.href = window.location.pathname;
}

/**
 * Adiciona listener as abas nas paginas que as possuem.
 */
function addTabListener() {
	$('form').submit(() => {
		$(window).unbind("beforeunload"); //Desativa o evento de descarregamento ao enviar form.
	});
	$(window).bind("beforeunload", function () {
		sessionStorage.removeItem("selected-tab"); //Remove a informação de aba selecionada ao fechar a janela
	});

	let tabs = $('.tabs li');
	for (let el of tabs) {
		let jEl = $(el);
		jEl.click(() => {
			tabs.removeClass('act'); //Desativa todas abas.
			jEl.addClass('act'); //Ativa a aba clicada.

			$('.tb-cnt').children().removeClass('act'); //Desativa todos os paineis
			let tab = jEl.children();
			let toEnable = tab.attr('class').replaceAll('tb', '');
			$(`#${toEnable}`).addClass('act'); //Ativa somente o painel da aba clicada.

			sessionStorage.setItem("selected-tab", tab.attr('class'));
		});
	}
	try {
		$(`a.${sessionStorage.getItem("selected-tab")}`).trigger('click'); //Coloca na aba correta se usuario já tiver trocado.
	} catch (err) { }
}

/**
 * Itera sobre os inputs contidos no parametro e preenche os mesmos com os valores iniciais.
 * @param {object} jsonWithData Objeto JSON contendo KEY com IDs/NOMES dos campos a serem preenchidos e seus valores
 */
function formFieldsFiller(jsonWithData, isImport = false) {
	for (let key in jsonWithData) {
		try {
			let el = $(`#${key}`);
			if (el.attr('type') == 'checkbox') {
				if ((typeof jsonWithData[key]) != 'boolean')
					jsonWithData[key] = ((jsonWithData[key] == 1) ? true : false); //Converte o valor pra boolean quando for de requisição MODBUS
				el.prop('checked', jsonWithData[key]);
			}
			else if (el.attr('type') == 'radio') {
				$(`input:radio[name='${key}'][value='${jsonWithData[key]}']`).prop('checked', true);
				el = $(document.getElementsByName(key));
			}
			else {
				if ((typeof jsonWithData[key]) == 'number' && !isImport)
					jsonWithData[key] = (jsonWithData[key] / ((el.attr('step') ?? '').includes('.') ? 10 : 1));
				el.val(jsonWithData[key]);
			}

			if (!isImport) {
				el.attr('initial-value', jsonWithData[key]);

				//Adiciona listener que coloca a borda vermelha quando muda.
				el.change((evt) => changeField(evt, el));
			}
			else {
				el.trigger('change'); //Triga o evento de troca pra pintar de vermelho o campo
			}
		}
		catch (err) {
			console.log(`Key: ${key}\nErro: ${err}`);
		}
	}
}

/**
 * Itera sobre os divs e spans contidos valores.
 * @param {object} jsonWithData Objeto JSON contendo KEY com IDs/NOMES dos campos a serem preenchidos e seus valores
 */
function textFieldsFiller(jsonWithData, isHtml = false) {
	for (let key in jsonWithData) {
		try {
			let el = $(`#${key}`);
			// if ((typeof jsonWithData[key]) == 'boolean')
			// 	jsonWithData[key] = ((jsonWithData[key] == 1) ? true : false); //Converte o valor pra boolean quando for de requisição MODBUS
			if (isHtml)
				el.html(jsonWithData[key]);
			else
				el.text(jsonWithData[key]);

		}
		catch (err) {
			console.log(`Key: ${key}\nErro: ${err}`);
		}
	}
}

/**
 * Trigga o import de arquivos.
 */
function importAGST() {
	$('#fileinput').trigger('click');
}
/**
 * Importa arquivos json e agst
 * @param {*} el Elemento que gerou o evento.
 */
function loadFile(el) {
	const file = el.files[0]; // Pega o primeiro arquivo selecionado
	if (file) {
		const reader = new FileReader();
		reader.onload = function (e) {
			const fileContent = e.target.result;

			try {
				formFieldsFiller(JSON.parse(fileContent), true); //Preenche os campos com as novas informações.
				// checkBoxListener();
			} catch (err) {
				alert('O arquivo não está no formato correto.');
			}
		};
		reader.readAsText(file); // Lê o arquivo como texto
	}
}

function exportAGST() {
	let jsonObj = {};

	let inputs = [...$('form input'), ...$('form select')];
	for (let el of inputs) {
		let jEl = $(el);
		let key = jEl.attr('name');

		if (jEl.attr('type') == 'checkbox') {
			jsonObj[key] = jEl.prop('checked');
		}
		else if (jEl.attr('type') == 'radio') {
			for (let radio of $(`[name="${key}"]`)) { //Vai repetir todas as vezes que achar o radio
				let jRadio = $(radio);
				if (jRadio.prop('checked')) {
					jsonObj[key] = jRadio.val();
					break;
				}
			}
		}
		else if (jEl.attr('type') != 'button' && jEl.attr('type') != 'submit') {
			jsonObj[key] = jEl.val();
		}
	}

	let now = new Date();
	jsonObj.DATA = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

	let blob = new Blob([JSON.stringify(jsonObj)], { type: 'application/json' });
	let url = URL.createObjectURL(blob);

	let aTag = $('<a />').attr('href', url).attr('download', window.location.pathname.includes('par.html') ? 'aplicação.agst' : 'configurações.json');
	aTag[0].click();
}

function dataTableTranslation(io = false) {
	return {
		decimal: ",",
		emptyTable: "Sem dados para exibir",
		info: "Mostrando _START_ até _END_ de _TOTAL_ linhas",
		infoEmpty: "Mostrando 0 a 0 de 0 linhas",
		infoFiltered: "(filtrado de _MAX_ linhas totais)",
		infoPostFix: "",
		thousands: ".",
		lengthMenu: "Mostrando _MENU_ linhas",
		loadingRecords: "Carregando...",
		processing: "",
		search: "Buscar:",
		zeroRecords: "Não encontrado",
		paginate: {
			first: "Primeiro",
			last: "Ultimo",
			next: "Próximo",
			previous: "Anterior"
		},
		buttons: {
			csv: "Exportar",
			excel: "Exportar",
			pageLength: (io ?
				{
					"-1": "Mostrar todos as portas",
					"_": "Mostrar %d portas"
				} :
				{
					"-1": "Mostrar todos os registros",
					"_": "Mostrar %d registros"
				}),
			print: "Imprimir",
			colvis: 'Ocultar Colunas'
		},
		aria: {
			sortAscending: ": activate to sort column ascending",
			sortDescending: ": activate to sort column descending"
		}
	}
}

/**
 * Rotaciona um Array em X posições para a direita (O ultimo elemento vira o primeiro a cada iteração)
 * @param {Array} array Arrai a rotacionar
 * @param {number} pos Quantidade a rotacionar.
 * @returns 
 */
function rotateArrayRight(array, pos) {
	let newArray = Array.from(array);

	if (pos > 0) {
		newArray.unshift(newArray[newArray.length - 1]);
		newArray.pop();
		newArray = rotateArrayRight(newArray, pos - 1)
	}

	return newArray;
}

/**
 * Rotaciona um Array em X posições para a esquerda (O primeiro elemento vira o ultimo a cada iteração)
 * @param {Array} array Arrai a rotacionar
 * @param {number} pos Quantidade a rotacionar.
 * @returns 
 */
function rotateArrayLeft(array, pos) {
	let newArray = Array.from(array);

	if (pos > 0) {
		newArray.push(newArray[0]);
		newArray.shift();
		newArray = rotateArrayLeft(newArray, pos - 1)
	}

	return newArray;
}