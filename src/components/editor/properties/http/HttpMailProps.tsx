import React, { useState } from 'react';
import { Eye, EyeOff } from '../../../common/Icons';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const HttpMailProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const [showMailPassword, setShowMailPassword] = useState(false);
  const type = actionNode.type;
  const name = actionNode.display_text?.toLowerCase() || '';

  const isHttpRequest = name.includes('http') && !name.includes('download') || type === 29;
  const isHttpDownload = name === 'http download' || type === 30;
  const isWaitToImage = name === 'wait to image' || type === 107;
  const isImageExists = name === 'image exists' || type === 108;
  const isImageSearch = name === 'image search' || type === 109;
  const isImageToBase64 = name === 'image to base64' || type === 110;
  const isReadMailCode = name.includes('read mail code') || type === 35;
  const isReadOutlookOAuth2 = name.includes('read outlook') || type === 80;

  // Luôn đảm bảo USE_PROFILE_PROXY là False cho HTTP Request (không đi qua proxy profile tránh IP yếu/bị chặn)
  React.useEffect(() => {
    if (isHttpRequest && getRawVal('USE_PROFILE_PROXY', 'False') !== 'False') {
      handleRawInputByKey('USE_PROFILE_PROXY', 'False');
    }
  }, [isHttpRequest, actionNode.id]);

  // HTTP REQUEST ACTION
  if (isHttpRequest && !isHttpDownload) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            URL
          </label>
          <VariableInput
            value={getRawVal('URL', '')}
            onChange={(val) => handleRawInputByKey('URL', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Method
          </label>
          <select
            value={getRawVal('METHOD', 'GET')}
            onChange={(e) => handleRawInputByKey('METHOD', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Headers
          </label>
          <VariableInput
            multiline
            rows={3}
            value={getRawVal('HEADER', getRawVal('HEADERS', ''))}
            onChange={(val) => handleRawInputByKey('HEADER', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Data
          </label>
          <VariableInput
            multiline
            rows={6}
            value={getRawVal('DATA', '')}
            onChange={(val) => handleRawInputByKey('DATA', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Timeout (s)
          </label>
          <input
            type="text"
            value={getRawVal('TIMEOUT', '')}
            onChange={(e) => handleRawInputByKey('TIMEOUT', e.target.value)}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div className="rounded-md bg-blue-50/60 dark:bg-[#1e293b]/70 border border-blue-200/60 dark:border-[#334155] p-2.5 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Kết nối trực tiếp (Direct IP - Không dùng proxy profile)
            </span>
          </div>
          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            Các phương thức HTTP (GET, POST, PUT, DELETE) luôn kết nối trực tiếp qua mạng máy, không chạy qua proxy của profile để tránh lỗi IP proxy yếu hoặc bị chặn.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // HTTP DOWNLOAD ACTION
  if (isHttpDownload) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            URL
          </label>
          <VariableInput
            value={getRawVal('URL', '')}
            onChange={(val) => handleRawInputByKey('URL', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Save Path
          </label>
          <VariableInput
            value={getRawVal('SAVE_PATH', '')}
            onChange={(val) => handleRawInputByKey('SAVE_PATH', val)}
            placeholder=""
            browseType="file"
            browseTitle="Select Save Path"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Headers
          </label>
          <VariableInput
            multiline
            rows={3}
            value={getRawVal('HEADER', getRawVal('HEADERS', ''))}
            onChange={(val) => handleRawInputByKey('HEADER', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // WAIT TO IMAGE ACTION
  if (isWaitToImage) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Image. Paste image from clipboard allowed
          </label>
          <VariableInput
            value={getRawVal('IMAGE', '')}
            onChange={(val) => handleRawInputByKey('IMAGE', val)}
            placeholder=""
            browseType="image"
            browseButtonText="..."
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Timeout (s)
          </label>
          <input
            type="text"
            value={getRawVal('TIMEOUT', '')}
            onChange={(e) => handleRawInputByKey('TIMEOUT', e.target.value)}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Threshold
          </label>
          <input
            type="text"
            value={getRawVal('THRESHOLD', '0.7')}
            onChange={(e) => handleRawInputByKey('THRESHOLD', e.target.value)}
            placeholder="0.7"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            True color
          </label>
          <select
            value={getRawVal('TRUE_COLOR', 'No')}
            onChange={(e) => handleRawInputByKey('TRUE_COLOR', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // IMAGE EXISTS ACTION
  if (isImageExists) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Image. Paste image from clipboard allowed
          </label>
          <VariableInput
            value={getRawVal('IMAGE', '')}
            onChange={(val) => handleRawInputByKey('IMAGE', val)}
            placeholder=""
            browseType="image"
            browseButtonText="..."
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Threshold
          </label>
          <input
            type="text"
            value={getRawVal('THRESHOLD', '0.7')}
            onChange={(e) => handleRawInputByKey('THRESHOLD', e.target.value)}
            placeholder="0.7"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            True color
          </label>
          <select
            value={getRawVal('TRUE_COLOR', 'No')}
            onChange={(e) => handleRawInputByKey('TRUE_COLOR', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // IMAGE SEARCH ACTION
  if (isImageSearch) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Image. Paste image from clipboard allowed
          </label>
          <VariableInput
            value={getRawVal('IMAGE', '')}
            onChange={(val) => handleRawInputByKey('IMAGE', val)}
            placeholder=""
            browseType="image"
            browseButtonText="..."
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Threshold
          </label>
          <input
            type="text"
            value={getRawVal('THRESHOLD', '0.7')}
            onChange={(e) => handleRawInputByKey('THRESHOLD', e.target.value)}
            placeholder="0.7"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            True color
          </label>
          <select
            value={getRawVal('TRUE_COLOR', 'No')}
            onChange={(e) => handleRawInputByKey('TRUE_COLOR', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // IMAGE TO BASE64 ACTION
  if (isImageToBase64) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Image file
          </label>
          <VariableInput
            value={getRawVal('IMAGE_PATH', getRawVal('IMAGE_FILE', ''))}
            onChange={(val) => handleRawInputByKey('IMAGE_PATH', val)}
            placeholder=""
            browseType="file"
            browseTitle="Select Image File"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // READ MAIL CODE ACTION
  if (isReadMailCode) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Email
          </label>
          <VariableInput
            value={getRawVal('USERNAME')}
            onChange={(val) => handleRawInputByKey('USERNAME', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Password
          </label>
          <div className="relative flex items-center">
            <input
              type={showMailPassword ? 'text' : 'password'}
              value={getRawVal('PASSWORD')}
              onChange={(e) => handleRawInputByKey('PASSWORD', e.target.value)}
              placeholder=""
              className="w-full px-3 py-1.5 pr-9 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowMailPassword(!showMailPassword)}
              className="absolute right-2.5 text-[#94a3b8] hover:text-[#1677ff] dark:hover:text-[#38bdf8] transition-colors cursor-pointer"
              title={showMailPassword ? 'Hide password' : 'Show password'}
            >
              {showMailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Mail server
          </label>
          <input
            type="text"
            value={getRawVal('MAIL_SERVER', 'imap.gmail.com')}
            onChange={(e) => handleRawInputByKey('MAIL_SERVER', e.target.value)}
            placeholder="imap.gmail.com"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Email sent to contains
          </label>
          <VariableInput
            value={getRawVal('FROM_CONTAINS')}
            onChange={(val) => handleRawInputByKey('FROM_CONTAINS', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Code type
          </label>
          <select
            value={getRawVal('CODE_TYPE', 'Number')}
            onChange={(e) => handleRawInputByKey('CODE_TYPE', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          >
            <option value="Number">Number</option>
            <option value="Text">Text</option>
            <option value="Full">Full</option>
          </select>
        </div>

        {getRawVal('CODE_TYPE', 'Number') === 'Number' && (
          <div>
            <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
              Code Length
            </label>
            <input
              type="number"
              value={getRawVal('CODE_LEN', '6')}
              onChange={(e) => handleRawInputByKey('CODE_LEN', e.target.value)}
              placeholder="6"
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
            />
          </div>
        )}

        {getRawVal('CODE_TYPE') === 'Text' && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                Code element xpath
              </label>
              <VariableInput
                value={getRawVal('CODE_XPATH')}
                onChange={(val) => handleRawInputByKey('CODE_XPATH', val)}
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                Code element attribute
              </label>
              <input
                type="text"
                value={getRawVal('CODE_ATTR', 'text')}
                onChange={(e) => handleRawInputByKey('CODE_ATTR', e.target.value)}
                placeholder="text"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Proxy
          </label>
          <VariableInput
            value={getRawVal('PROXY')}
            onChange={(val) => handleRawInputByKey('PROXY', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder="otp"
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // READ OUTLOOK (OAUTH2) ACTION
  if (isReadOutlookOAuth2) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Email|Pass|Refresh token|Client ID or Email|Refresh token|Client ID or Email|Pass
          </label>
          <VariableInput
            value={getRawVal('DATA')}
            onChange={(val) => handleRawInputByKey('DATA', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Email sent to contains
          </label>
          <VariableInput
            value={getRawVal('FROM_CONTAINS')}
            onChange={(val) => handleRawInputByKey('FROM_CONTAINS', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Code type
          </label>
          <select
            value={getRawVal('CODE_TYPE', 'Full')}
            onChange={(e) => handleRawInputByKey('CODE_TYPE', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          >
            <option value="Full">Full</option>
            <option value="Number">Number</option>
            <option value="Text">Text</option>
          </select>
        </div>

        {getRawVal('CODE_TYPE', 'Full') === 'Number' && (
          <div>
            <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
              Code Length
            </label>
            <input
              type="number"
              value={getRawVal('CODE_LEN', '6')}
              onChange={(e) => handleRawInputByKey('CODE_LEN', e.target.value)}
              placeholder="6"
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
            />
          </div>
        )}

        {getRawVal('CODE_TYPE') === 'Text' && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                Code element xpath
              </label>
              <VariableInput
                value={getRawVal('CODE_XPATH')}
                onChange={(val) => handleRawInputByKey('CODE_XPATH', val)}
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                Code element attribute
              </label>
              <input
                type="text"
                value={getRawVal('CODE_ATTR', 'text')}
                onChange={(e) => handleRawInputByKey('CODE_ATTR', e.target.value)}
                placeholder="text"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Proxy
          </label>
          <VariableInput
            value={getRawVal('PROXY')}
            onChange={(val) => handleRawInputByKey('PROXY', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder="mailContent"
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  return null;
};
