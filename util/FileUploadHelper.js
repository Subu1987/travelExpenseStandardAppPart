/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
(function(){"use strict";jQuery.sap.declare("sap.fin.travel.lib.reuse.util.FileUploadHelper");jQuery.sap.require("sap.fin.travel.lib.reuse.util.MessageUtil");jQuery.sap.require("jquery.sap.resources");sap.fin.travel.lib.reuse.util.FileUploadHelper={};sap.fin.travel.lib.reuse.util.FileUploadHelper.fileSizeExceedHandler=function(e,m){var M=[];var f=e.getParameter("fileName");var F=e.getParameter("fileSize");F=Math.round(F*100)/100;F+=" MB";var s=Math.round(m*100)/100+" MB";var r=sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();M.push(r.getText("FILEUPLOAD_ERROR_FILE_SIZE",[F,s]));sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({error:r.getText("FILEUPLOAD_ERROR_FILE_BEFORE_UPLOAD",f),detail:M.join("\n"),title:r.getText("ERROR")});};sap.fin.travel.lib.reuse.util.FileUploadHelper.fileTypeMissmatchHandler=function(e,a){var r=sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({error:r.getText("FILEUPLOAD_ERROR_FILE_BEFORE_UPLOAD",e.getParameter("fileName")),detail:r.getText("FILEUPLOAD_ERROR_FILE_EXTENSION",[e.getParameter("mimeType"),a]),title:r.getText("ERROR"),});};sap.fin.travel.lib.reuse.util.FileUploadHelper.beforeUploadFile=function(e){var s=e.getSource();var c=s.getBindingContext();var f=encodeURIComponent(e.getParameter("files")[0].name);var r=sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();var C=e.getSource().getBindingContext().getProperty("Tripno")===sap.fin.travel.lib.reuse.util.TravelUtil.TripNumber.Initial;var m=[];if(C&&!e.getSource().getBindingContext().getProperty("Receiptno")){m.push(r.getText("FILEUPLOAD_ERROR_IN_CREATION_MODE_FILE_BEFORE_UPLOAD"));}if(m.length>0){sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({error:r.getText("FILEUPLOAD_ERROR_FILE_BEFORE_UPLOAD",f),detail:m.join("\n"),title:r.getText("ERROR"),});throw new Error("Abort upload because of errors");}s.setUploadUrl(c.getModel().sServiceUrl+c.sPath+"/Attachments");var M=c.getModel();var t="x-cs"+"rf-token";M.refreshSecurityToken();var T=M.getHeaders()[t];if(!T){jQuery.sap.log.error("Could not get XSRF token");sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({error:r.getText("FILEUPLOAD_ERROR_TOKEN"),title:r.getText("ERROR"),});throw new Error("Abort upload because of errors");}var a="attachment; filename=\""+f+"\"";var o,b,d,g,h;var p=e.getSource().removeAllHeaderParameters();if(e.getParameter("id").indexOf("bus_doc_file_uploader")>-1){o=new sap.ui.unified.FileUploaderParameter({name:t,value:T});b=new sap.ui.unified.FileUploaderParameter({name:"X-Requested-With",value:"XMLHttpRequest"});d=new sap.ui.unified.FileUploaderParameter({name:"Content-Disposition",value:a});g=new sap.ui.unified.FileUploaderParameter({name:"slug",value:encodeURIComponent(f)});h=new sap.ui.unified.FileUploaderParameter({name:"Content-Type",value:"application/octet-stream"});p.forEach(function(P){if(P.getId()==="Document-Type"){s.addHeaderParameter(P);}});}else{o=new sap.m.UploadCollectionParameter({name:t,value:T});b=new sap.m.UploadCollectionParameter({name:"X-Requested-With",value:"XMLHttpRequest"});d=new sap.m.UploadCollectionParameter({name:"Content-Disposition",value:a});g=new sap.m.UploadCollectionParameter({name:"slug",value:encodeURIComponent(f)});h=new sap.m.UploadCollectionParameter({name:"Content-Type",value:"application/octet-stream"});}s.addHeaderParameter(o);s.addHeaderParameter(b);s.addHeaderParameter(d);s.addHeaderParameter(h);s.addHeaderParameter(g);};sap.fin.travel.lib.reuse.util.FileUploadHelper._updateUploadCollection=function(e,u){var s=u?u:e.getSource();s.getBinding("items").refresh();};sap.fin.travel.lib.reuse.util.FileUploadHelper.onGOSUploadComplete=function(e){var s=e.getParameters().getParameter("status");if(s!==201){sap.fin.travel.lib.reuse.util.FileUploadHelper._fileUploadFailure(e);}else{sap.fin.travel.lib.reuse.util.FileUploadHelper._updateUploadCollection(e);}};sap.fin.travel.lib.reuse.util.FileUploadHelper.onBusDocUploadComplete=function(e,u){var s=e.getSource();var a=e.getParameters().status;if(a!==201){s.abort();sap.fin.travel.lib.reuse.util.FileUploadHelper._fileUploadFailure(e);}else{sap.fin.travel.lib.reuse.util.FileUploadHelper._updateUploadCollection(e,u);}s.clear();s.removeAllHeaderParameters();};sap.fin.travel.lib.reuse.util.FileUploadHelper.uploadText=function(t,d,i,c,s,e){var C=c.getBindingContext();var m=C.getModel();sap.fin.travel.lib.reuse.util.PersistenceHelper.callFunction(m,{name:"/UploadText",urlParameters:{Pernr:m.getData(C.sPath).Pernr,Tripno:m.getData(C.sPath).Tripno,Title:t,Text:d,IsNote:i},success:function(){if(typeof s==="function"){s.apply(null,arguments);}c.getBinding("items").refresh();},error:(typeof e==="function")?e:sap.fin.travel.lib.reuse.util.FileUploadHelper._onError});};sap.fin.travel.lib.reuse.util.FileUploadHelper.deleteUploadedFile=function(e){var s=e.getSource();var S=jQuery.proxy(function(){s.getBinding("items").refresh();},this);var p={success:S,error:sap.fin.travel.lib.reuse.util.FileUploadHelper._onError};s.getModel().remove("/Attachments("+encodeURI(e.getParameter("documentId"))+")",p);};sap.fin.travel.lib.reuse.util.FileUploadHelper._fileUploadFailure=function(E){var f=E.getParameter("files");var a=f?f[0].name:E.getParameter("fileName");var r=f?f[0].responseRaw:E.getParameter("responseRaw");var R=sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();jQuery.sap.log.debug("Upload of file "+a+" failed!");var b;try{var x=$.parseXML(r),c=$(x),m=c.find("message");b=m[0].textContent;}catch(e){b=r;}sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({error:b,title:R.getText("ERROR"),});};sap.fin.travel.lib.reuse.util.FileUploadHelper._onError=function(e,t){};sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle=function(){if(!this.oResourceBundle){this.oResourceBundle=sap.ui.getCore().getLibraryResourceBundle("sap.fin.travel.lib.reuse");}return this.oResourceBundle;};}());
